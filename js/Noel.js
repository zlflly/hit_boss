class Noel extends Entity{
	static BufferTime=3;
	static RunSpeed=6;
	static DashSpeed=12;
	static CoyoteTime=10;
	static DashTime=24;
	static JumpSpeed=-16;
	static JumpHBoost=4;
	static Gravity=1.6;
	static LowGravityThreshold=4;
	static FallSpeed=10;
	static FastFallMul=1.5;
	
	// 战斗系统参数
	static MaxHealth=100;
	static AttackDamage=25;
	static AttackRange=40;
	static AttackTime=24;
	static HurtTime=30;
	static InvulnerableTime=60;
	
	static animationSpeed={
		'stand':6,
		'walk':8,
		'run':9,
		'jump':16,
		'jump2':8,
		'fall':8,
		'fall2':8,
		'dash':8,
		'attack':4,
		'hurt':8,
		'death':8
	};
	
	constructor(s1,s2){
		let size=new Vector(20,32);
		s1.scale.set(1.5,1.5);
		s2.scale.set(1.5,1.5)
		let animationMachine=new AnimationMachine(s1,s2);
		super(size,animationMachine);
		this.anchor.set(0.5,1.0);
		this.animationMachine.changeAnimation('stand');
		
		this.blockEvent=false;
		this.coyoteTimer=0;
		this.dash=1;
		this.dashTimer=0;
		this.dashShadow=[];
		this.status="normal";
		
		// 战斗系统属性
		this.health=Noel.MaxHealth;
		this.attackTimer=0;
		this.hurtTimer=0;
		this.invulnerableTimer=0;
		this.isDead=false;
		
		// 攻击视觉效果
		this.attackEffectTimer=0;
		this.showAttackRange=false;
	}
	async loadHintImg(){
		let img=await game.dataManager.loadImg('img/point.png');
		this.interactionHint=img;
	}
	//人物是否位于地面
	isOnGround(){
		let hitbox=this.hitbox;
		let rect=new Rect(hitbox.position.add(0,1),hitbox.size);
		let hitboxes=game.mapManager.getCollidable();
		for(let i of hitboxes){
			if(rect.containsRect(i)){
				return true;
			}
		}
		return false;
	}
	//更新人物的状态
	update(delta){
		this.updateAnimation(delta);
		if(!game.eventManager.event)this.checkEvent();
		
		// 更新战斗计时器
		this.updateCombatTimers();
		
		// 检查死亡状态
		if(this.isDead) return;
		
		switch(this.status){
		case "normal":
			this.updateNormal(delta);
			break;
		case "dash":
			this.updateDash(delta);
			break;
		case "attack":
			this.updateAttack(delta);
			break;
		case "hurt":
			this.updateHurt(delta);
			break;
		}
		
		//移动人物，如果发生碰撞，则清零对应方向速度
		this.rigidMove(this.velocity,game.mapManager.getCollidable(),(function(contactSide){
			if(contactSide=='H'){
				this.velocity.x=0;
				this.remainder.x=0;
			}else if(contactSide=='V'){
				this.velocity.y=0;
				this.remainder.y=0;
			}
		}).bind(this));
	}
	//计算人物的移动速度
	updateNormal(delta){
		let onGround=this.isOnGround();
		let machine=this.animationMachine;
		let v=this.velocity;
		let moveX=game.inputManager.getMoveX();
		let moveY=game.inputManager.getMoveY();
		let jump=game.inputManager.getJump();
		let dash=game.inputManager.getDash();
		let attack=game.inputManager.getAttack();
		
		//如果有事件在进行，覆盖掉按键输入
		if(this.blockMove){
			moveX=0;
			moveY=0;
			jump=0;
			dash=0;
			attack=0;
		}
		
		//处理攻击
		if(attack&&game.gameFrame-attack.timeStamp<=Noel.BufferTime){
			if(this.tryAttack()){
				return; // 攻击成功，退出normal更新
			}
		}
		
		//处理冲刺
		if(game.saveManager.data.canDash&&dash&&game.gameFrame-dash.timeStamp<=Noel.BufferTime&&this.dash>0){
			this.dash--;
			this.status="dash";
			this.dashTimer=Noel.DashTime;
			this.updateDash();
			return;
		}
		
		//处理水平移动
		if(moveX!=0){
			this.facing=moveX;
			if(Math.abs(v.x)<=Noel.RunSpeed){
				v.x=moveX*Math.min(Math.sqrt(v.x*v.x+6),Noel.RunSpeed);
			}else if(onGround){
				v.x-=(v.x-Noel.RunSpeed*moveX)*0.05;
			}else{
				v.x=Math.max(v.x*moveX-0.06,Noel.RunSpeed)*moveX;
			}
			if(onGround&&machine.current!='run'){
				machine.changeAnimation('run');
			}
		}else{
			v.x*=Math.exp(-1.57);
			if(Math.abs(v.x)<0.05*Noel.RunSpeed){
				v.x=0;
				if(onGround&&machine.current!='stand'){
					machine.changeAnimation('stand');
				}
			}
		}
		
		//重置土狼计时器与冲刺，处理跳跃
		if(onGround){
			this.coyoteTimer=Noel.CoyoteTime;
			this.dash=1;
		}
		if(jump){
			if(game.gameFrame-jump.timeStamp<=Noel.BufferTime&&this.coyoteTimer>0){
				this.coyoteTimer=0;
				v.y=Noel.JumpSpeed;
				v.x+=Noel.JumpHBoost*moveX;
				machine.changeAnimation('jump');
			}
		}
		
		//处理下落
		if(!onGround){
			this.coyoteTimer=Math.max(this.coyoteTimer-1,0);
			
			let Gravity=Noel.Gravity;
			if(v.y<=Noel.LowGravityThreshold&&jump){
				Gravity/=2;
			}
			let FallSpeed=Noel.FallSpeed;
			if(moveY==1){
				FallSpeed*=Noel.FastFallMul;
			}
			v.y=Math.min(v.y+Gravity,FallSpeed);
			if(v.y>0&&['fall','fall2'].indexOf(machine.current)==-1){
				machine.changeAnimation('fall');
			}
		}
	}
	updateDash(delta){
		let onGround=this.isOnGround();
		let machine=this.animationMachine;
		let v=this.velocity;
		let moveX=game.inputManager.getMoveX();
		let moveY=game.inputManager.getMoveY();
		let jump=game.inputManager.getJump();
		this.dashTimer--;
		
		if(this.dashTimer>=18){
			v.set(0,0);
			return;
		}
		if(this.dashTimer==17){
			if(machine.current!="run")machine.changeAnimation("run");
			if(onGround&&moveY==1)moveY=0;
			if(moveX==0)moveX=this.facing;
			this.facing=moveX;
			v.x=Noel.DashSpeed*moveX;
			v.y=Noel.DashSpeed*moveY/1.2;
		}
		
		moveX=this.facing;
		//重置土狼计时器与冲刺，处理跳跃
		if(onGround){
			this.coyoteTimer=Noel.CoyoteTime;
			if(this.dashTimer<=5)this.dash=1;
		}else{
			this.coyoteTimer=Math.max(this.coyoteTimer-1,0);
		}
		if(jump){
			if(game.gameFrame-jump.timeStamp<=Noel.BufferTime&&this.coyoteTimer>0){
				this.coyoteTimer=0;
				this.dashTimer=0;
				v.y+=Noel.JumpSpeed;
				v.x+=Noel.JumpHBoost*moveX;
				machine.changeAnimation('jump');
			}
		}
		
		if(this.dashTimer==0){
			this.status='normal';
		}
	}
	//按设定的速度控制人物动画的播放
	updateAnimation(delta){
		let machine=this.animationMachine;
		if(machine.timer>1){
			if(this.status=="dash"){
				this.dashShadow.push({
					"pos":new Vector(this.position),
					"frame":machine.currentFrame,
					"inverted":this.facing==1,
					"time":15
				});
			}
			machine.timer--;
			let animation=machine.spritesheet.animations[machine.current];
			//当前动画播放结束时，判断应该循环播放还是切换动画
			if(machine.currentFrame==animation.length-1){
				switch(machine.current){
					case 'jump':
					machine.changeAnimation('jump2');
					break;
					case 'fall':
					machine.changeAnimation('fall2');
					break;
					default:
					machine.currentFrame=0;
					break;
				}
			}else{
				machine.currentFrame++;
			}
		}
		machine.timer+=Noel.animationSpeed[machine.current]/60;
	}
	//检查是否应触发事件
	checkEvent(){
		let hitbox=this.hitbox;
		let negativeEvent=false;
		let canInteract=false;
		for(let i of game.mapManager.events){
			if(hitbox.containsRect(i)&&game.saveManager.checkFilter(i.event)){
				if(i.event.trigger=='negative'){
					negativeEvent=true;
					if(!this.blockEvent){
						game.eventManager.set(i.event);
						this.blockEvent=true;
						return;
					}
				}else if(i.event.trigger=='positive'){
					if(game.inputManager.getInteraction()){
						game.eventManager.set(i.event);
						this.blockEvent=true;
						return;
					}else{
						canInteract=true;
					}
				}
			}
		}
		if(!negativeEvent)this.blockEvent=false;
		this.canInteract=canInteract;
	}
	draw(){
		for(let i=0;i<this.dashShadow.length;i++){
			let shadow=this.dashShadow[i];
			let pos=game.camera.getDrawPos(shadow.pos.sub(24,48));
			this.animationMachine.drawShadow(pos,shadow.frame,shadow.inverted);
			shadow.time--;
			if(shadow.time==1)this.dashShadow.splice(i--,1);
		}
		
		// 攻击时的角色闪烁效果
		let shouldDraw = true;
		if(this.status === 'attack' && this.attackTimer % 4 < 2) {
			// 攻击时角色闪烁（白色轮廓效果）
			game.ctx.shadowColor = '#ffffff';
			game.ctx.shadowBlur = 8;
		}
		
		let pos=game.camera.getDrawPos(this.position.sub(24,48));
		this.animationMachine.draw(pos,this.facing==1);
		
		// 清除阴影效果
		game.ctx.shadowColor = 'transparent';
		game.ctx.shadowBlur = 0;
		
		// 绘制攻击范围指示器
		if(this.showAttackRange && this.attackEffectTimer > 0) {
			this.drawAttackRange();
		}
		
		// 绘制攻击轨迹特效
		if(this.status === 'attack' && this.attackTimer > 12 && this.attackTimer < 18) {
			this.drawAttackTrail();
		}
		
		if(this.canInteract&&!game.eventManager.event){
			let pos=game.camera.getDrawPos(this.position.sub(11,152));
			game.ctx.drawImage(this.interactionHint,pos.x,pos.y);
		}
		
		// 绘制生命值条
		this.drawHealthBar();
	}
	
	// ===== 战斗系统方法 =====
	
	updateCombatTimers(){
		if(this.attackTimer>0) this.attackTimer--;
		if(this.hurtTimer>0) this.hurtTimer--;  
		if(this.invulnerableTimer>0) this.invulnerableTimer--;
		if(this.attackEffectTimer>0) this.attackEffectTimer--;
	}
	
	updateAttack(delta){
		let machine=this.animationMachine;
		
		// 攻击期间的移动效果
		if(this.attackTimer > 18) {
			// 攻击前摇：向后蓄力
			this.velocity.x = -this.facing * 2;
		} else if(this.attackTimer > 12) {
			// 攻击爆发：快速向前冲刺
			this.velocity.x = this.facing * 8;
		} else {
			// 攻击后摇：逐渐停止
			this.velocity.x *= 0.6;
		}
		
		this.attackTimer--;
		if(this.attackTimer <= 0){
			this.status = "normal";
			this.showAttackRange = false;
			machine.changeAnimation('stand');
		}
	}
	
	updateHurt(delta){
		let machine=this.animationMachine;
		
		// 受伤时向后弹飞
		this.velocity.x*=0.9;
		
		this.hurtTimer--;
		if(this.hurtTimer<=0){
			if(this.health<=0){
				this.isDead=true;
				machine.changeAnimation('death');
			}else{
				this.status="normal";
				machine.changeAnimation('stand');
			}
		}
	}
	
	tryAttack(){
		if(this.status!='normal'||this.attackTimer>0) return false;
		
		this.status='attack';
		this.attackTimer=Noel.AttackTime;
		this.animationMachine.changeAnimation('attack');
		
		// 启动攻击视觉效果
		this.attackEffectTimer=20;
		this.showAttackRange=true;
		
		// 检查攻击范围内的敌人
		this.checkAttackHit();
		
		console.log('🗡️ Mouse2 执行攻击! 面向:' + (this.facing === 1 ? '右' : '左'));
		return true;
	}
	
	checkAttackHit(){
		// 攻击范围检测（针对Boss）
		if(game.boss&&!game.boss.isDead){
			let distance=Math.abs(this.position.x-game.boss.position.x);
			if(distance<=Noel.AttackRange){
				game.boss.takeDamage(Noel.AttackDamage,this.facing);
			}
		}
	}
	
	takeDamage(damage,attackerFacing=1){
		if(this.invulnerableTimer>0||this.isDead) return false;
		
		this.health-=damage;
		this.hurtTimer=Noel.HurtTime;
		this.invulnerableTimer=Noel.InvulnerableTime;
		
		// 击退效果
		this.velocity.x=attackerFacing*8;
		
		if(this.health<=0){
			this.health=0;
			this.isDead=true;
			this.status='hurt';
			this.animationMachine.changeAnimation('death');
		}else{
			this.status='hurt';
			this.animationMachine.changeAnimation('hurt');
		}
		
		return true;
	}
	
	getAttackHitbox(){
		let attackPos=this.position.add(this.facing*Noel.AttackRange/2,0);
		return new Rect(attackPos.sub(Noel.AttackRange/2,16),new Vector(Noel.AttackRange,32));
	}
	
	drawAttackRange(){
		let attackHitbox = this.getAttackHitbox();
		let pos = game.camera.getDrawPos(attackHitbox.position);
		
		// 半透明红色攻击范围
		game.ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
		game.ctx.fillRect(pos.x, pos.y, attackHitbox.size.x, attackHitbox.size.y);
		
		// 攻击范围边框
		game.ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
		game.ctx.lineWidth = 2;
		game.ctx.strokeRect(pos.x, pos.y, attackHitbox.size.x, attackHitbox.size.y);
	}
	
	drawAttackTrail(){
		let startX = this.position.x - this.facing * 20;
		let endX = this.position.x + this.facing * 30;
		let y = this.position.y - 16;
		
		let startPos = game.camera.getDrawPos(new Vector(startX, y));
		let endPos = game.camera.getDrawPos(new Vector(endX, y));
		
		// 攻击轨迹线
		game.ctx.strokeStyle = '#ffff00';
		game.ctx.lineWidth = 4;
		game.ctx.lineCap = 'round';
		
		game.ctx.beginPath();
		game.ctx.moveTo(startPos.x, startPos.y);
		game.ctx.lineTo(endPos.x, endPos.y);
		game.ctx.stroke();
		
		// 攻击轨迹发光效果
		game.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
		game.ctx.lineWidth = 8;
		game.ctx.stroke();
	}
	
	drawHealthBar(){
		if(this.isDead) return;
		
		let healthPercent = this.health / Noel.MaxHealth;
		let barWidth = 60;
		let barHeight = 6;
		
		let pos = game.camera.getDrawPos(this.position.sub(barWidth / 2, 50));
		
		// 背景条
		game.ctx.fillStyle = '#333';
		game.ctx.fillRect(pos.x, pos.y, barWidth, barHeight);
		
		// 生命值条
		game.ctx.fillStyle = healthPercent > 0.3 ? '#4f4' : '#f44';
		game.ctx.fillRect(pos.x, pos.y, barWidth * healthPercent, barHeight);
		
		// 边框
		game.ctx.strokeStyle = '#fff';
		game.ctx.lineWidth = 1;
		game.ctx.strokeRect(pos.x, pos.y, barWidth, barHeight);
		
		// 生命值文字
		game.ctx.fillStyle = '#fff';
		game.ctx.font = '12px Arial';
		game.ctx.textAlign = 'center';
		game.ctx.fillText(`${this.health}/${Noel.MaxHealth}`, pos.x + barWidth/2, pos.y - 2);
	}
}
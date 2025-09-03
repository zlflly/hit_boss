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
	static AttackRange=56;
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
		this.hasHitDuringAttack=false;
		
		// 攻击视觉效果
		this.attackEffectTimer=0;
		this.showAttackRange=false;
		this.attackAuraTimer=0;
		this.attackParticles=[];

		// 屏幕震动效果
		this.screenShakeTimer=0;
		this.screenShakeIntensity=0;

		// 新增炫酷攻击特效
		this.energyWaves = [];
		this.impactParticles = [];
		this.lightRays = [];
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
		
		// 检查死亡状态
		if(this.isDead) return;

		if(!game.eventManager.event)this.checkEvent();
		
		// 更新战斗计时器
		this.updateCombatTimers();
		
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
			
			if (machine.current === 'death') {
				if (machine.currentFrame < animation.length - 1) {
					machine.currentFrame++;
				}
			} else {
				if(machine.currentFrame < animation.length - 1){
					machine.currentFrame++;
				} else {
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
				}
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
		
		// 绘制炫酷的攻击特效（移除难看的红色方块）
		if(this.status === 'attack' && this.attackTimer > 0) {
			this.drawCoolAttackEffects();
		}
		
		// 炫酷攻击特效都已经在 drawCoolAttackEffects() 中统一处理
		
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
		if(this.attackAuraTimer>0) this.attackAuraTimer--;
		if(this.screenShakeTimer>0) this.screenShakeTimer--;

		// 更新攻击粒子效果
		this.updateAttackParticles();

		// 更新炫酷攻击特效
		this.updateEnergyWaves();
		this.updateImpactParticles();
		this.updateLightRays();
	}

	updateAttackParticles(){
		// 更新粒子位置和生命周期
		for(let i=0; i<this.attackParticles.length; i++){
			let particle = this.attackParticles[i];
			particle.x += particle.vx;
			particle.y += particle.vy;
			particle.life--;
			particle.alpha = particle.life / particle.maxLife;

			if(particle.life <= 0){
				this.attackParticles.splice(i--, 1);
			}
		}
	}

	createAttackParticles(){
		// 在攻击时创建粒子效果
		let particleCount = 8;
		let attackPos = this.position.add(this.facing * 25, -8);

		for(let i=0; i<particleCount; i++){
			let angle = (Math.PI * 2 * i / particleCount) + Math.random() * 0.5;
			let speed = 2 + Math.random() * 3;

			this.attackParticles.push({
				x: attackPos.x,
				y: attackPos.y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 1,
				life: 20 + Math.random() * 10,
				maxLife: 30,
				alpha: 1,
				color: Math.random() > 0.5 ? '#ffff00' : '#ffaa00'
			});
		}
	}

	updateAttack(delta){
		let machine=this.animationMachine;

		// 攻击期间的移动效果 - 更流畅的移动过渡
		let progress = 1 - (this.attackTimer / Noel.AttackTime);

		if(progress < 0.25) {
			// 攻击前摇：缓慢向后蓄力，营造蓄势待发的感觉
			let easeIn = progress / 0.25;
			this.velocity.x = -this.facing * 2 * easeIn;
		} else if(progress < 0.5) {
			// 攻击蓄力阶段：停顿蓄力
			this.velocity.x *= 0.8;
		} else if(progress < 0.75) {
			// 攻击爆发：快速向前冲刺
			let easeOut = (progress - 0.5) / 0.25;
			let speed = 8 + easeOut * 4; // 速度逐渐增加
			this.velocity.x = this.facing * speed;
		} else {
			// 攻击后摇：平滑减速
			let easeOut = (progress - 0.75) / 0.25;
			this.velocity.x *= (0.9 - easeOut * 0.3);
		}

		// 在攻击的有效帧窗口内进行命中检测（改进检测时机）
		if(this.attackTimer <= 20 && this.attackTimer > 12){
			this.checkAttackHit();
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
		this.hasHitDuringAttack=false;
		
		// 启动攻击视觉效果
		this.attackEffectTimer=24;
		this.attackAuraTimer=32;
		this.showAttackRange=true;

		// 创建攻击粒子效果
		this.createAttackParticles();

		// 初始化炫酷攻击特效
		this.initCoolAttackEffects();

		// 触发屏幕震动
		this.triggerScreenShake(12, 4);
		
		console.log('🗡️ Mouse2 执行攻击! 面向:' + (this.facing === 1 ? '右' : '左'));
		return true;
	}
	
	checkAttackHit(){
		// 使用攻击矩形与Boss受击范围（hurtbox）重叠来判定命中，且每次攻击只命中一次
		if(game.boss && !game.boss.isDead && !this.hasHitDuringAttack){
			let attackHitbox = this.getAttackHitbox();
			let bossHurtbox = (typeof game.boss.getHurtbox === 'function') ? game.boss.getHurtbox() : game.boss.hitbox;
			if(attackHitbox.containsRect(bossHurtbox)){
				game.boss.takeDamage(Noel.AttackDamage, this.facing);
				this.hasHitDuringAttack = true;

				// 🎯 命中时创建冲击粒子效果
				this.createImpactParticles();

				console.log('💥 攻击命中！创建冲击特效');
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
		let startX = this.position.x - this.facing * 25;
		let endX = this.position.x + this.facing * 35;
		let y = this.position.y - 16;

		let startPos = game.camera.getDrawPos(new Vector(startX, y));
		let endPos = game.camera.getDrawPos(new Vector(endX, y));

		game.ctx.save();

		// 创建动态的攻击轨迹效果
		let trailLength = endX - startX;
		let segments = 10;

		// 绘制多层轨迹以创造深度感
		for(let layer = 0; layer < 3; layer++){
			let alpha = (3 - layer) * 0.3;
			let width = (4 - layer) * 2;
			let offset = layer * 2;

			game.ctx.strokeStyle = layer === 0 ? '#ffffff' :
								 layer === 1 ? '#ffff00' : '#ffaa00';
			game.ctx.lineWidth = width;
			game.ctx.lineCap = 'round';
			game.ctx.globalAlpha = alpha;

			game.ctx.beginPath();
			game.ctx.moveTo(startPos.x, startPos.y + offset);

			// 创建波浪形的轨迹
			for(let i = 1; i <= segments; i++){
				let t = i / segments;
				let x = startPos.x + (endPos.x - startPos.x) * t;
				let wave = Math.sin(t * Math.PI * 2 + game.gameFrame * 0.5) * 3 * (1 - t);
				let y = startPos.y + offset + wave;

				if(i === 1){
					game.ctx.lineTo(x, y);
				} else {
					game.ctx.lineTo(x, y);
				}
			}

			game.ctx.stroke();
		}

		// 添加轨迹粒子效果
		let particleCount = 6;
		for(let i = 0; i < particleCount; i++){
			let t = i / particleCount;
			let x = startX + trailLength * t + Math.sin(game.gameFrame * 0.3 + i) * 5;
			let yOffset = Math.sin(t * Math.PI + game.gameFrame * 0.4) * 4;
			let particlePos = game.camera.getDrawPos(new Vector(x, y + yOffset));

			game.ctx.globalAlpha = 0.8 - t * 0.6;
			game.ctx.fillStyle = '#ffffff';
			game.ctx.fillRect(particlePos.x - 1, particlePos.y - 1, 3, 3);

			// 粒子发光效果
			game.ctx.shadowColor = '#ffff00';
			game.ctx.shadowBlur = 4;
			game.ctx.fillRect(particlePos.x - 1, particlePos.y - 1, 3, 3);
		}

		game.ctx.restore();
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

	triggerScreenShake(duration, intensity){
		// 触发屏幕震动效果
		this.screenShakeTimer = duration;
		this.screenShakeIntensity = intensity;

		// 如果相机支持震动，传递给相机
		if(game.camera && typeof game.camera.setShake === 'function'){
			game.camera.setShake(duration, intensity);
		}
	}

	getScreenShakeOffset(){
		// 获取屏幕震动的偏移量
		if(this.screenShakeTimer <= 0) return {x: 0, y: 0};

		let progress = this.screenShakeTimer / 12; // 假设最大持续时间为12
		let currentIntensity = this.screenShakeIntensity * progress;

		return {
			x: (Math.random() - 0.5) * currentIntensity * 2,
			y: (Math.random() - 0.5) * currentIntensity * 2
		};
	}

	// ===== 新增炫酷攻击特效系统 =====

	initCoolAttackEffects(){
		// 初始化能量波纹
		this.energyWaves = [];
		for(let i = 0; i < 3; i++){
			this.energyWaves.push({
				radius: 0,
				maxRadius: 40 + i * 15,
				alpha: 1,
				speed: 3 + i * 1.5,
				color: i === 0 ? '#ffffff' : i === 1 ? '#00ffff' : '#ff00ff'
			});
		}

		// 初始化光线
		this.lightRays = [];
		for(let i = 0; i < 8; i++){
			let angle = (Math.PI * 2 * i / 8) + Math.PI/16; // 稍微偏移角度
			this.lightRays.push({
				angle: angle,
				length: 60,
				alpha: 1,
				phase: i * 0.5,
				color: i % 2 === 0 ? '#ffffff' : '#ffff00'
			});
		}

		// 初始化冲击粒子
		this.impactParticles = [];
	}

	updateEnergyWaves(){
		for(let wave of this.energyWaves){
			wave.radius += wave.speed;
			wave.alpha = Math.max(0, 1 - (wave.radius / wave.maxRadius));

			if(wave.radius > wave.maxRadius){
				wave.radius = 0; // 重置波纹
			}
		}
	}

	updateImpactParticles(){
		// 冲击粒子会在攻击命中时产生
		for(let i = 0; i < this.impactParticles.length; i++){
			let particle = this.impactParticles[i];
			particle.x += particle.vx;
			particle.y += particle.vy;
			particle.life--;

			if(particle.life <= 0){
				this.impactParticles.splice(i--, 1);
			}
		}
	}

	updateLightRays(){
		for(let ray of this.lightRays){
			ray.alpha = 0.3 + Math.sin(game.gameFrame * 0.2 + ray.phase) * 0.7;
			ray.length = 50 + Math.sin(game.gameFrame * 0.15 + ray.phase) * 20;
		}
	}

	createImpactParticles(){
		// 在攻击命中时创建爆炸粒子
		let hitPos = this.position.add(this.facing * Noel.AttackRange/2, -8);
		let particleCount = 12;

		for(let i = 0; i < particleCount; i++){
			let angle = Math.random() * Math.PI * 2;
			let speed = 3 + Math.random() * 5;

			this.impactParticles.push({
				x: hitPos.x,
				y: hitPos.y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 2,
				life: 25 + Math.random() * 15,
				color: Math.random() > 0.5 ? '#ff4444' : '#ffaa00',
				size: 2 + Math.random() * 3
			});
		}
	}

	drawCoolAttackEffects(){
		game.ctx.save();

		let centerPos = game.camera.getDrawPos(this.position.sub(0, 16));
		let progress = 1 - (this.attackTimer / Noel.AttackTime);

		// 绘制能量波纹
		this.drawEnergyWaves(centerPos, progress);

		// 绘制激光剑轨迹
		if(progress > 0.3 && progress < 0.8){
			this.drawLaserSwordTrail(centerPos, progress);
		}

		// 绘制光线效果
		if(progress > 0.2){
			this.drawLightRays(centerPos, progress);
		}

		// 绘制冲击粒子
		this.drawImpactParticles();

		// 绘制攻击时的特殊光晕
		if(progress > 0.4 && progress < 0.7){
			this.drawAttackGlow(centerPos, progress);
		}

		game.ctx.restore();
	}

	drawEnergyWaves(centerPos, progress){
		for(let wave of this.energyWaves){
			if(wave.alpha > 0.1){
				let currentRadius = wave.radius * (0.5 + progress * 0.5);

				game.ctx.globalAlpha = wave.alpha * (1 - progress * 0.3);
				game.ctx.strokeStyle = wave.color;
				game.ctx.lineWidth = 2;
				game.ctx.shadowColor = wave.color;
				game.ctx.shadowBlur = 8;

				game.ctx.beginPath();
				game.ctx.arc(centerPos.x, centerPos.y, currentRadius, 0, Math.PI * 2);
				game.ctx.stroke();

				// 内圈高亮
				game.ctx.strokeStyle = '#ffffff';
				game.ctx.lineWidth = 1;
				game.ctx.globalAlpha = wave.alpha * 0.5;
				game.ctx.stroke();
			}
		}

		game.ctx.shadowBlur = 0;
	}

	drawLaserSwordTrail(centerPos, progress){
		let attackProgress = (progress - 0.3) / 0.5; // 0-1 之间的攻击进度
		let swordLength = 80 * attackProgress;
		let swordWidth = 6 * (1 - attackProgress * 0.7);

		let startX = centerPos.x;
		let endX = centerPos.x + this.facing * swordLength;
		let y = centerPos.y;

		// 绘制剑身主体
		let gradient = game.ctx.createLinearGradient(startX, y, endX, y);
		gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
		gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.8)');
		gradient.addColorStop(0.7, 'rgba(255, 0, 255, 0.7)');
		gradient.addColorStop(1, 'rgba(255, 255, 0, 0.3)');

		game.ctx.strokeStyle = gradient;
		game.ctx.lineWidth = swordWidth;
		game.ctx.lineCap = 'round';
		game.ctx.shadowColor = '#00ffff';
		game.ctx.shadowBlur = 10;

		game.ctx.beginPath();
		game.ctx.moveTo(startX, y);
		game.ctx.lineTo(endX, y);
		game.ctx.stroke();

		// 绘制剑刃光效
		game.ctx.strokeStyle = '#ffffff';
		game.ctx.lineWidth = swordWidth * 0.3;
		game.ctx.shadowColor = '#ffffff';
		game.ctx.shadowBlur = 15;
		game.ctx.stroke();

		// 剑尖特效
		if(attackProgress > 0.8){
			let tipX = endX;
			let tipY = y;

			game.ctx.fillStyle = '#ffffff';
			game.ctx.shadowColor = '#ffff00';
			game.ctx.shadowBlur = 20;
			game.ctx.globalAlpha = (attackProgress - 0.8) / 0.2;

			game.ctx.beginPath();
			game.ctx.arc(tipX, tipY, 8, 0, Math.PI * 2);
			game.ctx.fill();
		}

		game.ctx.shadowBlur = 0;
	}

	drawLightRays(centerPos, progress){
		let rayProgress = (progress - 0.2) / 0.8; // 0-1

		for(let ray of this.lightRays){
			let startX = centerPos.x;
			let startY = centerPos.y;
			let endX = centerPos.x + Math.cos(ray.angle) * ray.length * rayProgress;
			let endY = centerPos.y + Math.sin(ray.angle) * ray.length * rayProgress;

			game.ctx.globalAlpha = ray.alpha * rayProgress;
			game.ctx.strokeStyle = ray.color;
			game.ctx.lineWidth = 1;
			game.ctx.shadowColor = ray.color;
			game.ctx.shadowBlur = 5;

			game.ctx.beginPath();
			game.ctx.moveTo(startX, startY);
			game.ctx.lineTo(endX, endY);
			game.ctx.stroke();
		}

		game.ctx.shadowBlur = 0;
	}

	drawImpactParticles(){
		for(let particle of this.impactParticles){
			let pos = game.camera.getDrawPos(new Vector(particle.x - particle.size/2, particle.y - particle.size/2));

			game.ctx.globalAlpha = particle.life / 30;
			game.ctx.fillStyle = particle.color;
			game.ctx.shadowColor = particle.color;
			game.ctx.shadowBlur = 3;

			game.ctx.fillRect(pos.x, pos.y, particle.size, particle.size);

			// 粒子尾迹
			game.ctx.fillStyle = particle.color;
			game.ctx.globalAlpha = particle.life / 60;
			game.ctx.fillRect(pos.x - particle.vx, pos.y - particle.vy, particle.size * 0.5, particle.size * 0.5);
		}

		game.ctx.shadowBlur = 0;
	}

	drawAttackGlow(centerPos, progress){
		let glowProgress = (progress - 0.4) / 0.3; // 0-1
		let glowRadius = 25 + glowProgress * 15;

		let gradient = game.ctx.createRadialGradient(
			centerPos.x, centerPos.y, 0,
			centerPos.x, centerPos.y, glowRadius
		);
		gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * glowProgress})`);
		gradient.addColorStop(0.5, `rgba(0, 255, 255, ${0.6 * glowProgress})`);
		gradient.addColorStop(1, `rgba(255, 0, 255, 0)`);

		game.ctx.fillStyle = gradient;
		game.ctx.shadowColor = '#ffffff';
		game.ctx.shadowBlur = 15;

		game.ctx.beginPath();
		game.ctx.arc(centerPos.x, centerPos.y, glowRadius, 0, Math.PI * 2);
		game.ctx.fill();

		game.ctx.shadowBlur = 0;
	}

	// 移除旧的攻击范围绘制方法
	// drawAttackRange() - 已移除，避免难看的红色方块

	// 移除旧的攻击轨迹方法，由新的激光剑轨迹替代
	// drawAttackTrail() - 已移除，由 drawLaserSwordTrail() 替代
}
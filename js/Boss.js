class Boss extends Entity {
	// 静态配置参数
	static MaxHealth = 200;
	static MoveSpeed = 2.5;         // 增加移动速度
	static AttackDamage = 30;
	static AttackRange = 60;
	static AttackCooldown = 120;    // 减少攻击冷却到2秒
	static DetectionRange = 500;    // 大幅增加检测距离
	static ChaseRange = 450;        // 大幅增加追击距离
	static ProjectileRange = 400;   // 光球攻击距离
	
	// AI状态枚举
	static States = {
		IDLE: 'idle',
		PATROL: 'patrol', 
		CHASE: 'chase',
		ATTACK: 'attack',
		RANGED_ATTACK: 'ranged_attack',  // 新增远程攻击状态
		HURT: 'hurt',
		DEATH: 'death'
	};
	
	static animationSpeed = {
		'idle': 8,
		'walk': 6,
		'attack': 4,
		'hurt': 6,
		'death': 10
	};
	
	constructor(image) {
		let size = new Vector(80, 100);  // 适应纸张Boss的尺寸
		super(size, null);
		
		// 直接使用单张图片
		this.image = image;
		this.scale = 0.4;  // 调整缩放比例以适应游戏
		
		// 注意：物理碰撞箱保持为构造时传入的尺寸，避免被图片尺寸放大后卡墙
		
		this.anchor.set(0.5, 1.0);
		
		// 受击范围（Hurtbox）配置：相对渲染矩形的比例与偏移，便于微调
		// widthScale/heightScale 为尺寸比例；offsetX/offsetY 为相对渲染矩形的偏移（0~1），正右/正下
		this.hurtboxConfig = {
			widthScale: 0.60,
			heightScale: 0.65,
			offsetX: 0.00,
			offsetY: 0.25
		};
		
		// 战斗属性
		this.health = Boss.MaxHealth;
		this.maxHealth = Boss.MaxHealth;
		this.isDead = false;
		
		// AI状态
		this.currentState = Boss.States.IDLE;
		this.lastState = Boss.States.IDLE;
		this.stateTimer = 0;
		
		// 战斗计时器
		this.attackTimer = 0;
		this.attackCooldown = 0;
		this.hurtTimer = 0;
		this.invulnerableTimer = 0;
		
		// AI行为
		this.targetPlayer = null;
		this.patrolDirection = 1;
		this.patrolDistance = 0;
		this.maxPatrolDistance = 200;
		
		// 光球攻击系统
		this.projectiles = [];
		this.projectileCooldown = 0;
		this.specialAttackCooldown = 0;
		this.specialAttackTimer = 0;
		
		console.log('🐉 Boss created with health:', this.health);
	}

	// 获取Boss的渲染矩形（与draw中偏移保持一致）
	getRenderRect(){
		if(!this.image){
			return new Rect(this.position.sub(40,50), this.size);
		}
		let width = this.image.width * this.scale;
		let height = this.image.height * this.scale;
		let topLeft = this.position.sub(40, 50);
		return new Rect(topLeft, new Vector(width, height));
	}

	// 基于渲染矩形计算Boss受击范围（水平居中，可向下偏移以贴合身体）
	getHurtbox(){
		let renderRect = this.getRenderRect();
		let rw = renderRect.size.x, rh = renderRect.size.y;
		let cfg = this.hurtboxConfig;
		let width = rw * cfg.widthScale;
		let height = rh * cfg.heightScale;
		let x = renderRect.position.x + (rw - width) / 2 + cfg.offsetX * rw;
		let y = renderRect.position.y + cfg.offsetY * rh;
		return new Rect(new Vector(x, y), new Vector(width, height));
	}
	
	update(delta) {
		if (this.isDead) {
			return;
		}
		
		// 更新计时器
		this.updateTimers();
		
		// 更新光球
		this.updateProjectiles();
		
		// AI状态机更新
		this.updateAI();
		
		// 物理更新
		this.rigidMove(this.velocity, game.mapManager.getCollidable(), this.handleCollision.bind(this));
	}
	
	updateTimers() {
		if (this.attackTimer > 0) this.attackTimer--;
		if (this.attackCooldown > 0) this.attackCooldown--;
		if (this.hurtTimer > 0) this.hurtTimer--;
		if (this.invulnerableTimer > 0) this.invulnerableTimer--;
		if (this.projectileCooldown > 0) this.projectileCooldown--;
		if (this.specialAttackCooldown > 0) this.specialAttackCooldown--;
		if (this.specialAttackTimer > 0) this.specialAttackTimer--;
		this.stateTimer++;
	}
	
	updateAI() {
		// 获取玩家距离
		let distanceToPlayer = this.getDistanceToPlayer();
		let oldState = this.currentState;
		
		switch (this.currentState) {
			case Boss.States.IDLE:
				this.updateIdleState(distanceToPlayer);
				break;
			case Boss.States.PATROL:
				this.updatePatrolState(distanceToPlayer);
				break;
			case Boss.States.CHASE:
				this.updateChaseState(distanceToPlayer);
				break;
			case Boss.States.ATTACK:
				this.updateAttackState();
				break;
			case Boss.States.RANGED_ATTACK:
				this.updateRangedAttackState(distanceToPlayer);
				break;
			case Boss.States.HURT:
				this.updateHurtState();
				break;
			case Boss.States.DEATH:
				// 死亡状态不需要更新
				break;
		}
		
		// 状态改变时重置计时器
		if (oldState !== this.currentState) {
			this.stateTimer = 0;
			this.lastState = oldState;
		}
	}
	
	updateIdleState(distanceToPlayer) {
		this.velocity.x *= 0.8; // 减速
		
		if (distanceToPlayer < Boss.DetectionRange) {
			this.setState(Boss.States.CHASE);
		} else if (this.stateTimer > 120) { // 2秒后开始巡逻
			this.setState(Boss.States.PATROL);
		}
	}
	
	updatePatrolState(distanceToPlayer) {
		// 检测玩家
		if (distanceToPlayer < Boss.DetectionRange) {
			this.setState(Boss.States.CHASE);
			return;
		}
		
		// 巡逻移动
		this.velocity.x = this.patrolDirection * Boss.MoveSpeed * 0.5;
		this.facing = this.patrolDirection;
		this.patrolDistance += Math.abs(this.velocity.x);
		
		// 改变巡逻方向
		if (this.patrolDistance > this.maxPatrolDistance) {
			this.patrolDirection *= -1;
			this.patrolDistance = 0;
		}
		
		// 巡逻一段时间后休息
		if (this.stateTimer > 300) { // 5秒后休息
			this.setState(Boss.States.IDLE);
		}
	}
	
	updateChaseState(distanceToPlayer) {
		if (distanceToPlayer > Boss.ChaseRange) {
			this.setState(Boss.States.IDLE);
			return;
		}
		
		// 近距离攻击
		if (distanceToPlayer < Boss.AttackRange && this.attackCooldown <= 0) {
			this.setState(Boss.States.ATTACK);
			return;
		}
		
		// 远程攻击 - 在追击范围内但超出近战范围时
		if (distanceToPlayer > Boss.AttackRange && distanceToPlayer <= Boss.ProjectileRange && this.projectileCooldown <= 0) {
			this.setState(Boss.States.RANGED_ATTACK);
			return;
		}
		
		// 追击玩家
		this.moveTowardsPlayer();
	}
	
	updateAttackState() {
		this.velocity.x *= 0.5; // 攻击时减速
		
		this.attackTimer--;
		if (this.attackTimer <= 0) {
			this.attackCooldown = Boss.AttackCooldown;
			
			// 执行攻击判定
			this.performAttack();
			
			// 随机选择攻击方式
			if (Math.random() < 0.5 && this.specialAttackCooldown <= 0) {
				// 50%概率使用特殊攻击
				this.performSpecialAttack();
			} else if (this.projectileCooldown <= 0) {
				// 发射光球
				this.shootProjectile();
			}
			
			this.setState(Boss.States.CHASE);
		}
	}
	
	updateRangedAttackState(distanceToPlayer) {
		// 远程攻击时稍微减速
		this.velocity.x *= 0.7;
		
		// 面向玩家
		if (game.noel) {
			let dx = game.noel.position.x - this.position.x;
			if (Math.abs(dx) > 10) {
				this.facing = Math.sign(dx);
			}
		}
		
		// 检查是否还能进行远程攻击
		if (distanceToPlayer > Boss.ProjectileRange || distanceToPlayer < Boss.AttackRange) {
			this.setState(Boss.States.CHASE);
			return;
		}
		
		// 执行远程攻击
		if (this.projectileCooldown <= 0) {
			this.shootProjectile();
			this.projectileCooldown = 30; // 减少冷却时间，更频繁攻击
		}
		
		// 随机切换到追击状态
		if (this.stateTimer > 60 && Math.random() < 0.1) {
			this.setState(Boss.States.CHASE);
		}
	}
	
	updateHurtState() {
		this.velocity.x *= 0.7; // 受伤时减速
		
		this.hurtTimer--;
		if (this.hurtTimer <= 0) {
			if (this.health <= 0) {
				this.setState(Boss.States.DEATH);
			} else {
				this.setState(Boss.States.CHASE);
			}
		}
	}
	
	setState(newState) {
		if (this.currentState === newState) return;
		
		this.currentState = newState;
		this.stateTimer = 0;
		
		// 状态转换时的行为
		switch (newState) {
			case Boss.States.IDLE:
				// 待机状态
				break;
			case Boss.States.PATROL:
			case Boss.States.CHASE:
				// 移动状态
				break;
			case Boss.States.ATTACK:
				this.attackTimer = 30; // 攻击持续时间
				break;
			case Boss.States.HURT:
				this.hurtTimer = 20;
				break;
			case Boss.States.DEATH:
				this.isDead = true;
				console.log('💀 Boss defeated!');
				break;
		}
	}
	
	moveTowardsPlayer() {
		if (!game.noel) return;
		
		let dx = game.noel.position.x - this.position.x;
		let distance = Math.abs(dx);
		
		if (distance > 10) { // 避免抖动
			this.facing = Math.sign(dx);
			this.velocity.x = this.facing * Boss.MoveSpeed;
		} else {
			this.velocity.x *= 0.5;
		}
	}
	
	performAttack() {
		console.log('⚔️ Boss attacks!');
		
		// 检查攻击范围内是否有玩家
		let distanceToPlayer = this.getDistanceToPlayer();
		if (distanceToPlayer <= Boss.AttackRange && game.noel && !game.noel.isDead) {
			// 对玩家造成伤害
			game.noel.takeDamage(Boss.AttackDamage, this.facing);
			console.log('💥 Boss hit player!');
		}
	}
	
	takeDamage(damage, attackerFacing = 1) {
		if (this.invulnerableTimer > 0 || this.isDead) return false;
		
		this.health -= damage;
		this.health = Math.max(0, this.health);
		
		console.log(`💥 Boss受到 ${damage} 点伤害! 生命值: ${this.health}/${this.maxHealth}`);
		
		// 击退效果 - 更明显的击退
		this.velocity.x = attackerFacing * 12;
		this.velocity.y = -3; // 轻微向上弹起
		
		// 无敌时间
		this.invulnerableTimer = 30;
		
		if (this.health <= 0) {
			this.setState(Boss.States.DEATH);
		} else {
			this.setState(Boss.States.HURT);
		}
		
		return true;
	}
	
	getDistanceToPlayer() {
		if (!game.noel) return Infinity;
		
		let dx = this.position.x - game.noel.position.x;
		let dy = this.position.y - game.noel.position.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
	
	handleCollision(contactSide) {
		if (contactSide === 'H') {
			this.velocity.x = 0;
			// 巡逻时碰到墙壁改变方向
			if (this.currentState === Boss.States.PATROL) {
				this.patrolDirection *= -1;
			}
		} else if (contactSide === 'V') {
			this.velocity.y = 0;
		}
	}
	

	
	draw() {
		// 受伤时闪烁效果
		if (this.invulnerableTimer > 0 && this.invulnerableTimer % 6 < 3) {
			return; // 跳过绘制产生闪烁
		}
		
		if (!this.image) return;
		
		let pos = game.camera.getDrawPos(this.position.sub(40, 50));
		let width = this.image.width * this.scale;
		let height = this.image.height * this.scale;
		
		// 根据朝向决定是否水平翻转
		if (this.facing === 1) {
			// 向右，正常绘制
			game.ctx.drawImage(this.image, pos.x, pos.y, width, height);
		} else {
			// 向左，水平翻转
			game.ctx.save();
			game.ctx.scale(-1, 1);
			game.ctx.drawImage(this.image, -pos.x - width, pos.y, width, height);
			game.ctx.restore();
		}
		
		// 绘制生命值条（调试用）
		this.drawHealthBar();
		
		// 绘制光球
		this.drawProjectiles();
		
		// 绘制受击范围（绿色框，便于调试对齐）
		if(!this.isDead){
			let hb = this.getHurtbox();
			let pos = game.camera.getDrawPos(hb.position);
			game.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
			game.ctx.lineWidth = 2;
			game.ctx.strokeRect(pos.x, pos.y, hb.size.x, hb.size.y);
		}
	}
	
	drawHealthBar() {
		if (this.isDead) return;
		
		let healthPercent = this.health / this.maxHealth;
		let barWidth = 80;
		let barHeight = 6;
		
		// 基于渲染矩形水平居中，并放在头顶上方
		let renderRect = this.getRenderRect();
		let centerX = renderRect.position.x + renderRect.size.x / 2;
		let topY = Math.max(0, renderRect.position.y - 12);
		let pos = game.camera.getDrawPos(new Vector(centerX - barWidth / 2, topY));
		
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
	}
	
	// ===== 光球攻击系统 =====
	
	updateProjectiles() {
		// 更新所有光球
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			this.projectiles[i].update();
		}
	}
	
	shootProjectile() {
		if (!game.noel || game.noel.isDead) return;
		
		// 计算朝向玩家的方向
		let dx = game.noel.position.x - this.position.x;
		let dy = game.noel.position.y - this.position.y;
		let distance = Math.sqrt(dx * dx + dy * dy);
		
		// 标准化方向向量
		let velocity = new Vector(
			(dx / distance) * 6,  // 增加光球速度
			(dy / distance) * 6
		);
		
		// 创建光球
		let projectile = new Projectile(
			this.position.x,
			this.position.y - 20,
			velocity,
			25, // 伤害
			180  // 生命周期
		);
		
		this.projectiles.push(projectile);
		this.projectileCooldown = 40; // 减少到0.67秒冷却
		
		console.log('💥 Boss发射光球!');
	}
	
	performSpecialAttack() {
		// 向四周无差别释放光球
		let projectileCount = 8;
		let angleStep = (Math.PI * 2) / projectileCount;
		
		for (let i = 0; i < projectileCount; i++) {
			let angle = i * angleStep;
			let velocity = new Vector(
				Math.cos(angle) * 4,  // 增加特殊攻击光球速度
				Math.sin(angle) * 4
			);
			
			let projectile = new Projectile(
				this.position.x,
				this.position.y - 20,
				velocity,
				20, // 伤害
				150  // 生命周期
			);
			
			this.projectiles.push(projectile);
		}
		
		this.specialAttackCooldown = 180; // 减少到3秒冷却
		console.log('💥 Boss释放全屏光球攻击!');
	}
	
	drawProjectiles() {
		// 绘制所有光球
		for (let projectile of this.projectiles) {
			projectile.draw();
		}
	}
}
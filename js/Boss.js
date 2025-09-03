class Boss extends Entity {
	// 静态配置参数
	static MaxHealth = 200;
	static MoveSpeed = 1.5;
	static AttackDamage = 30;
	static AttackRange = 60;
	static AttackCooldown = 180;    // 3秒攻击冷却
	static DetectionRange = 300;    // 检测玩家距离
	static ChaseRange = 250;        // 追击距离
	
	// AI状态枚举
	static States = {
		IDLE: 'idle',
		PATROL: 'patrol', 
		CHASE: 'chase',
		ATTACK: 'attack',
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
		
		this.anchor.set(0.5, 1.0);
		
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
		
		console.log('🐉 Boss created with health:', this.health);
	}
	
	update(delta) {
		if (this.isDead) {
			return;
		}
		
		// 更新计时器
		this.updateTimers();
		
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
		
		if (distanceToPlayer < Boss.AttackRange && this.attackCooldown <= 0) {
			this.setState(Boss.States.ATTACK);
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
	}
	
	drawHealthBar() {
		if (this.isDead) return;
		
		let healthPercent = this.health / this.maxHealth;
		let barWidth = 80;
		let barHeight = 6;
		
		let pos = game.camera.getDrawPos(this.position.sub(barWidth / 2, 60));
		
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
}
class Projectile extends Entity {
	constructor(x, y, velocity, damage = 20, lifetime = 120) {
		let size = new Vector(8, 8);
		super(size, null);
		
		this.position.set(x, y);
		this.velocity = velocity;
		this.damage = damage;
		this.lifetime = lifetime;
		this.age = 0;
		
		// 光球颜色（随机选择）
		this.colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
		this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
		
		// 光球大小变化
		this.baseSize = 8;
		this.pulseSpeed = 0.2;
		this.pulsePhase = Math.random() * Math.PI * 2;
	}
	
	update(delta) {
		this.age++;
		
		// 检查生命周期
		if (this.age >= this.lifetime) {
			this.destroy();
			return;
		}
		
		// 移动
		this.position.addEqual(this.velocity);
		
		// 检查边界碰撞
		if (this.position.x < 0 || this.position.x > 992 || 
			this.position.y < 0 || this.position.y > 576) {
			this.destroy();
			return;
		}
		
		// 检查与地图碰撞
		let hitboxes = game.mapManager.getCollidable();
		for (let hitbox of hitboxes) {
			if (this.hitbox.containsRect(hitbox)) {
				this.destroy();
				return;
			}
		}
		
		// 检查与玩家碰撞
		if (game.noel && !game.noel.isDead) {
			if (this.hitbox.containsRect(game.noel.hitbox)) {
				game.noel.takeDamage(this.damage, Math.sign(this.velocity.x));
				this.destroy();
				return;
			}
		}
	}
	
	draw() {
		let pos = game.camera.getDrawPos(this.position.sub(this.baseSize/2, this.baseSize/2));
		
		// 计算脉冲大小
		let pulse = Math.sin(this.age * this.pulseSpeed + this.pulsePhase) * 0.3 + 1;
		let size = this.baseSize * pulse;
		
		// 绘制光球主体
		game.ctx.save();
		
		// 发光效果
		game.ctx.shadowColor = this.color;
		game.ctx.shadowBlur = 15;
		
		// 外圈（较暗）
		game.ctx.fillStyle = this.color + '80'; // 50%透明度
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size/2, 0, Math.PI * 2);
		game.ctx.fill();
		
		// 内圈（较亮）
		game.ctx.fillStyle = this.color;
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size/3, 0, Math.PI * 2);
		game.ctx.fill();
		
		// 核心（最亮）
		game.ctx.fillStyle = '#ffffff';
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size/6, 0, Math.PI * 2);
		game.ctx.fill();
		
		game.ctx.restore();
		
		// 绘制轨迹
		this.drawTrail();
	}
	
	drawTrail() {
		// 简单的轨迹效果
		let trailLength = 5;
		for (let i = 1; i <= trailLength; i++) {
			let trailPos = this.position.sub(this.velocity.mul(i * 2));
			let trailSize = this.baseSize * (1 - i / trailLength) * 0.5;
			let pos = game.camera.getDrawPos(trailPos.sub(trailSize/2, trailSize/2));
			
			game.ctx.fillStyle = this.color + Math.floor(255 * (1 - i / trailLength)).toString(16).padStart(2, '0');
			game.ctx.beginPath();
			game.ctx.arc(pos.x + trailSize/2, pos.y + trailSize/2, trailSize/2, 0, Math.PI * 2);
			game.ctx.fill();
		}
	}
	
	destroy() {
		// 创建爆炸效果
		this.createExplosion();
		
		// 从游戏中移除
		if (game.boss && game.boss.projectiles) {
			let index = game.boss.projectiles.indexOf(this);
			if (index > -1) {
				game.boss.projectiles.splice(index, 1);
			}
		}
	}
	
	createExplosion() {
		// 简单的爆炸粒子效果
		for (let i = 0; i < 8; i++) {
			let angle = (i / 8) * Math.PI * 2;
			let speed = 2 + Math.random() * 3;
			let velocity = new Vector(
				Math.cos(angle) * speed,
				Math.sin(angle) * speed
			);
			
			// 创建爆炸粒子（简化版）
			game.ctx.save();
			let pos = game.camera.getDrawPos(this.position);
			game.ctx.fillStyle = this.color + '60';
			game.ctx.beginPath();
			game.ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
			game.ctx.fill();
			game.ctx.restore();
		}
	}
}

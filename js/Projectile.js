class Projectile extends Entity {
	constructor(x, y, velocity, damage = 20, lifetime = 120) {
		let size = new Vector(16, 16); // 增大碰撞盒
		super(size, null);
		
		this.position.set(x, y);
		this.velocity = velocity;
		this.damage = damage;
		this.lifetime = lifetime;
		this.age = 0;
		
		// 科技感颜色（更炫酷的配色）
		this.colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080', '#8000ff'];
		this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
		
		// 光球大小变化
		this.baseSize = 20; // 增大基础尺寸
		this.pulseSpeed = 0.15;
		this.pulsePhase = Math.random() * Math.PI * 2;
		
		// 反射系统
		this.reflectCount = 0;
		this.maxReflects = 3;
		this.lastCollisionTime = 0;
		
		// 科技感特效参数
		this.energyRings = []; // 能量环
		this.particles = []; // 粒子效果
		this.rotation = 0; // 旋转角度
		this.rotationSpeed = 0.1; // 旋转速度
		
		// 初始化能量环
		this.initEnergyRings();
	}
	
	initEnergyRings() {
		// 创建多个能量环
		for (let i = 0; i < 3; i++) {
			this.energyRings.push({
				radius: (i + 1) * 8,
				opacity: 0.3 - (i * 0.1),
				rotation: i * Math.PI / 3,
				rotationSpeed: 0.05 + (i * 0.02)
			});
		}
	}
	
	update(delta) {
		this.age++;
		
		// 更新旋转
		this.rotation += this.rotationSpeed;
		
		// 更新能量环
		for (let ring of this.energyRings) {
			ring.rotation += ring.rotationSpeed;
		}
		
		// 生成粒子效果
		if (Math.random() < 0.3) {
			this.createParticle();
		}
		
		// 更新粒子
		for (let i = this.particles.length - 1; i >= 0; i--) {
			let particle = this.particles[i];
			particle.life--;
			particle.x += particle.vx;
			particle.y += particle.vy;
			particle.vy += 0.1; // 重力
			
			if (particle.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
		
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
		
		// 检查与地图碰撞并处理反射
		let hitboxes = game.mapManager.getCollidable();
		for (let hitbox of hitboxes) {
			if (this.hitbox.containsRect(hitbox)) {
				// 防止连续碰撞
				if (this.age - this.lastCollisionTime < 5) {
					continue;
				}
				
				// 检查是否还能反射
				if (this.reflectCount >= this.maxReflects) {
					this.destroy();
					return;
				}
				
				// 执行反射
				this.reflect(hitbox);
				this.lastCollisionTime = this.age;
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
	
	createParticle() {
		// 创建能量粒子
		let angle = Math.random() * Math.PI * 2;
		let speed = 1 + Math.random() * 2;
		this.particles.push({
			x: this.position.x + (Math.random() - 0.5) * 10,
			y: this.position.y + (Math.random() - 0.5) * 10,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 20 + Math.random() * 20,
			color: this.color,
			size: 2 + Math.random() * 3
		});
	}
	
	reflect(hitbox) {
		this.reflectCount++;
		
		// 计算光球中心点
		let centerX = this.position.x;
		let centerY = this.position.y;
		
		// 计算碰撞面的法向量
		let normalX = 0;
		let normalY = 0;
		
		// 判断碰撞面（水平或垂直）
		let dx = centerX - (hitbox.position.x + hitbox.size.x / 2);
		let dy = centerY - (hitbox.position.y + hitbox.size.y / 2);
		
		// 根据碰撞位置确定反射面
		if (Math.abs(dx) / hitbox.size.x > Math.abs(dy) / hitbox.size.y) {
			// 水平碰撞（左右墙面）
			normalX = Math.sign(dx);
			normalY = 0;
		} else {
			// 垂直碰撞（上下墙面）
			normalX = 0;
			normalY = Math.sign(dy);
		}
		
		// 计算反射向量：R = V - 2(V·N)N
		let dotProduct = this.velocity.x * normalX + this.velocity.y * normalY;
		this.velocity.x = this.velocity.x - 2 * dotProduct * normalX;
		this.velocity.y = this.velocity.y - 2 * dotProduct * normalY;
		
		// 将光球移出碰撞区域
		let moveDistance = 5;
		this.position.x += normalX * moveDistance;
		this.position.y += normalY * moveDistance;
		
		// 减少光球速度（每次反射后稍微减速）
		this.velocity.x *= 0.9;
		this.velocity.y *= 0.9;
		
		// 创建反射特效
		this.createReflectEffect();
		
		console.log(`💥 光球反射! 反射次数: ${this.reflectCount}/${this.maxReflects}`);
	}
	
	createReflectEffect() {
		// 简单的反射特效
		let pos = game.camera.getDrawPos(this.position);
		
		// 反射闪光效果
		game.ctx.save();
		game.ctx.fillStyle = '#ffffff';
		game.ctx.shadowColor = this.color;
		game.ctx.shadowBlur = 20;
		game.ctx.beginPath();
		game.ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
		game.ctx.fill();
		game.ctx.restore();
	}
	
	draw() {
		let pos = game.camera.getDrawPos(this.position.sub(this.baseSize/2, this.baseSize/2));
		
		// 计算脉冲大小
		let pulse = Math.sin(this.age * this.pulseSpeed + this.pulsePhase) * 0.4 + 1;
		let size = this.baseSize * pulse;
		
		// 根据反射次数调整颜色强度
		this.colorIntensity = 1 - (this.reflectCount * 0.15);
		this.colorIntensity = Math.max(0.4, this.colorIntensity);
		
		// 绘制粒子效果
		this.drawParticles();
		
		// 绘制能量环
		this.drawEnergyRings(pos, size);
		
		// 绘制光球主体
		game.ctx.save();
		
		// 外层能量场
		game.ctx.shadowColor = this.color;
		game.ctx.shadowBlur = 25;
		game.ctx.fillStyle = this.color + '20';
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size * 0.8, 0, Math.PI * 2);
		game.ctx.fill();
		
		// 中层能量
		game.ctx.shadowBlur = 20;
		let midAlpha = Math.floor(100 * this.colorIntensity).toString(16).padStart(2, '0');
		game.ctx.fillStyle = this.color + midAlpha;
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size * 0.6, 0, Math.PI * 2);
		game.ctx.fill();
		
		// 内层核心
		game.ctx.shadowBlur = 15;
		let innerAlpha = Math.floor(200 * this.colorIntensity).toString(16).padStart(2, '0');
		game.ctx.fillStyle = this.color + innerAlpha;
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size * 0.4, 0, Math.PI * 2);
		game.ctx.fill();
		
		// 最内层白色核心
		game.ctx.shadowBlur = 10;
		game.ctx.fillStyle = '#ffffff';
		game.ctx.beginPath();
		game.ctx.arc(pos.x + size/2, pos.y + size/2, size * 0.2, 0, Math.PI * 2);
		game.ctx.fill();
		
		// 绘制科技感边框
		this.drawTechBorder(pos, size);
		
		game.ctx.restore();
		
		// 绘制轨迹
		this.drawTrail();
	}
	
	drawParticles() {
		// 绘制能量粒子
		for (let particle of this.particles) {
			let particlePos = game.camera.getDrawPos(new Vector(particle.x, particle.y));
			let alpha = Math.floor(255 * (particle.life / 40)).toString(16).padStart(2, '0');
			
			game.ctx.save();
			game.ctx.fillStyle = particle.color + alpha;
			game.ctx.shadowColor = particle.color;
			game.ctx.shadowBlur = 8;
			game.ctx.beginPath();
			game.ctx.arc(particlePos.x, particlePos.y, particle.size, 0, Math.PI * 2);
			game.ctx.fill();
			game.ctx.restore();
		}
	}
	
	drawEnergyRings(pos, size) {
		// 绘制旋转的能量环
		for (let ring of this.energyRings) {
			game.ctx.save();
			game.ctx.translate(pos.x + size/2, pos.y + size/2);
			game.ctx.rotate(ring.rotation);
			
			game.ctx.strokeStyle = this.color + Math.floor(255 * ring.opacity * this.colorIntensity).toString(16).padStart(2, '0');
			game.ctx.lineWidth = 2;
			game.ctx.shadowColor = this.color;
			game.ctx.shadowBlur = 10;
			
			// 绘制能量环
			game.ctx.beginPath();
			game.ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
			game.ctx.stroke();
			
			// 绘制能量环上的节点
			for (let i = 0; i < 6; i++) {
				let angle = (i / 6) * Math.PI * 2;
				let x = Math.cos(angle) * ring.radius;
				let y = Math.sin(angle) * ring.radius;
				
				game.ctx.fillStyle = this.color;
				game.ctx.beginPath();
				game.ctx.arc(x, y, 2, 0, Math.PI * 2);
				game.ctx.fill();
			}
			
			game.ctx.restore();
		}
	}
	
	drawTechBorder(pos, size) {
		// 绘制科技感边框
		game.ctx.save();
		game.ctx.translate(pos.x + size/2, pos.y + size/2);
		game.ctx.rotate(this.rotation);
		
		game.ctx.strokeStyle = this.color + '80';
		game.ctx.lineWidth = 1;
		game.ctx.shadowColor = this.color;
		game.ctx.shadowBlur = 5;
		
		// 绘制六边形边框
		game.ctx.beginPath();
		for (let i = 0; i < 6; i++) {
			let angle = (i / 6) * Math.PI * 2;
			let x = Math.cos(angle) * size * 0.5;
			let y = Math.sin(angle) * size * 0.5;
			
			if (i === 0) {
				game.ctx.moveTo(x, y);
			} else {
				game.ctx.lineTo(x, y);
			}
		}
		game.ctx.closePath();
		game.ctx.stroke();
		
		// 绘制对角线
		for (let i = 0; i < 3; i++) {
			let angle = (i / 3) * Math.PI * 2;
			let x1 = Math.cos(angle) * size * 0.3;
			let y1 = Math.sin(angle) * size * 0.3;
			let x2 = Math.cos(angle + Math.PI) * size * 0.3;
			let y2 = Math.sin(angle + Math.PI) * size * 0.3;
			
			game.ctx.beginPath();
			game.ctx.moveTo(x1, y1);
			game.ctx.lineTo(x2, y2);
			game.ctx.stroke();
		}
		
		game.ctx.restore();
	}
	
	drawTrail() {
		// 增强的轨迹效果
		let trailLength = 8;
		for (let i = 1; i <= trailLength; i++) {
			let trailPos = this.position.sub(this.velocity.mul(i * 1.5));
			let trailSize = this.baseSize * (1 - i / trailLength) * 0.6;
			let pos = game.camera.getDrawPos(trailPos.sub(trailSize/2, trailSize/2));
			
			game.ctx.save();
			
			// 轨迹发光效果
			game.ctx.shadowColor = this.color;
			game.ctx.shadowBlur = 8 * (1 - i / trailLength);
			
			let trailAlpha = Math.floor(255 * (1 - i / trailLength) * this.colorIntensity).toString(16).padStart(2, '0');
			game.ctx.fillStyle = this.color + trailAlpha;
			game.ctx.beginPath();
			game.ctx.arc(pos.x + trailSize/2, pos.y + trailSize/2, trailSize/2, 0, Math.PI * 2);
			game.ctx.fill();
			
			// 轨迹边框
			game.ctx.strokeStyle = this.color + Math.floor(128 * (1 - i / trailLength)).toString(16).padStart(2, '0');
			game.ctx.lineWidth = 1;
			game.ctx.stroke();
			
			game.ctx.restore();
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
		// 增强的爆炸粒子效果
		for (let i = 0; i < 12; i++) {
			let angle = (i / 12) * Math.PI * 2;
			let speed = 3 + Math.random() * 4;
			let velocity = new Vector(
				Math.cos(angle) * speed,
				Math.sin(angle) * speed
			);
			
			// 创建爆炸粒子
			game.ctx.save();
			let pos = game.camera.getDrawPos(this.position);
			
			// 爆炸发光效果
			game.ctx.shadowColor = this.color;
			game.ctx.shadowBlur = 15;
			game.ctx.fillStyle = this.color + '80';
			game.ctx.beginPath();
			game.ctx.arc(pos.x, pos.y, 4 + Math.random() * 3, 0, Math.PI * 2);
			game.ctx.fill();
			
			// 爆炸核心
			game.ctx.fillStyle = '#ffffff';
			game.ctx.beginPath();
			game.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
			game.ctx.fill();
			
			game.ctx.restore();
		}
		
		// 创建能量波
		game.ctx.save();
		let pos = game.camera.getDrawPos(this.position);
		game.ctx.strokeStyle = this.color + '40';
		game.ctx.lineWidth = 3;
		game.ctx.shadowColor = this.color;
		game.ctx.shadowBlur = 20;
		
		for (let i = 0; i < 3; i++) {
			let radius = 10 + i * 8;
			game.ctx.beginPath();
			game.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
			game.ctx.stroke();
		}
		
		game.ctx.restore();
	}
}

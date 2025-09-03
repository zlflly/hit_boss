class AnimationMachine{
	constructor(s1,s2){
		this.spritesheet=s1;
		this.spritesheetInverted=s2;
		this.timer=0;
		this.current=null;
		this.currentFrame=0;
	}
	changeAnimation(name){
		this.timer=0;
		this.current=name;
		this.currentFrame=0;
	}
	draw(pos,inverted){
		let s=inverted?this.spritesheetInverted:this.spritesheet;
		let key=s.animations[this.current][this.currentFrame];
		s.draw(key,pos,inverted);
	}
	drawShadow(pos,frame,inverted){
		let s=inverted?this.spritesheetInverted:this.spritesheet;
		let key=s.animations["dash"][frame];
		s.draw(key,pos,inverted);
	}
}
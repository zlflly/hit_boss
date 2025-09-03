class Spritesheet{
	constructor(json,img,walkImg=null){
		this.scale=new Vector(1,1);
		this.json=json;
		this.frames=json.frames;
		this.animations=json.animations;
		this.img=img;
		this.walkImg=walkImg || img;
	}
	draw(key,pos,inverted=false){
		let frame=this.json.frames[key];
		let {x,y,w,h}=frame.frame;
		
		// 根据动画类型选择对应的图片
		let currentImg = this.img;
		if(key.startsWith('walk/') && this.walkImg) {
			currentImg = this.walkImg;
		}
		
		if(inverted){
			let w2=currentImg.width;
			x=w2-x-w;
		}
		game.ctx.drawImage(
			currentImg,x,y,w,h,
			pos.x,pos.y,
			w*this.scale.x,h*this.scale.y);
	}
}
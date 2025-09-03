class DataManager{
	constructor(){
		
	}
	async loadJSON(src){
		let jsonp=document.createElement('script');
		jsonp.src=src;
		let json=await new Promise(resolve=>{
			this.resolve=resolve;
			document.getElementById('resource').appendChild(jsonp);
		});
		document.getElementById('resource').removeChild(jsonp);
		return json;
	}
	async loadImg(src){
		let img=await new Promise(resolve=>{
			let img=new Image();
			img.src=src;
			img.onload=()=>resolve(img);
		});
		return img;
	}
	async loadSpritesheet(src){
		let json=await this.loadJSON(src);
		let imgsrc=src.split('/');
		imgsrc[imgsrc.length-1]=json.meta.image;
		imgsrc=imgsrc.join('/');
		let img=await this.loadImg(imgsrc);
		
		// 如果有分离的动画图片，也加载它们
		let walkImg = null, attackImg = null, hurtImg = null, deathImg = null;
		if(json.meta.walkImage) {
			let walkImgsrc=src.split('/');
			walkImgsrc[walkImgsrc.length-1]=json.meta.walkImage;
			walkImgsrc=walkImgsrc.join('/');
			walkImg=await this.loadImg(walkImgsrc);
		}
		if(json.meta.attackImage){
			let a=src.split('/');
			a[a.length-1]=json.meta.attackImage;
			a=a.join('/');
			attackImg=await this.loadImg(a);
		}
		if(json.meta.hurtImage){
			let a=src.split('/');
			a[a.length-1]=json.meta.hurtImage;
			a=a.join('/');
			hurtImg=await this.loadImg(a);
		}
		if(json.meta.deathImage){
			let a=src.split('/');
			a[a.length-1]=json.meta.deathImage;
			a=a.join('/');
			deathImg=await this.loadImg(a);
		}
		
		return new Spritesheet(json,img,walkImg,attackImg,hurtImg,deathImg);
	}
}
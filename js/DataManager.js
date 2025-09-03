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
		
		// 如果有走路动画图片，也加载它
		let walkImg = null;
		if(json.meta.walkImage) {
			let walkImgsrc=src.split('/');
			walkImgsrc[walkImgsrc.length-1]=json.meta.walkImage;
			walkImgsrc=walkImgsrc.join('/');
			walkImg=await this.loadImg(walkImgsrc);
		}
		
		return new Spritesheet(json,img,walkImg);
	}
}
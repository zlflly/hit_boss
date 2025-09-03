class Tile extends Rect{
	constructor(x,y,w,h,img,event){
		super(x,y,w,h);
		this.img=img;
		this.event=event;
	}
	draw(){
		if(!this.img)return;
		let pos=game.camera.getDrawPos(this.position);
		game.ctx.drawImage(this.img,pos.x,pos.y);
	}
}

class MapManager{
	constructor(){
		this.background=null;
		this.tiles=[];
		this.viewable=[];
		this.collidable=[];
		this.events=[];
		this.test=[];
		this.fade=true;
	}
	async loadMap(src){
		if(!this.fade){
			await this.fadeOut();
			this.fade=true;
		}
		let data=await game.dataManager.loadJSON(src);
		this.empty();
		for(let i of data.tileMap){
			this.addTile(i);
		}
		if(data.background){
			let bg=await game.dataManager.loadImg(data.background);
			this.background=bg;
		}
		this.current=src;
		game.camera.setBound(data.cameraBound);
	}
	async addTile(i){
		const [x,y,w,h]=i.hitbox;
		let img=null;
		if(i.texture&&i.texture!="test")img=await game.dataManager.loadImg(i.texture);
		let tile=new Tile(x,y,w,h,img,i.event);
		
		if(i.id)tile.id=i.id;
		this.tiles.push(tile);
		if(i.collidable!==false)this.collidable.push(tile);
		if(i.texture){
			if(i.texture!='test'){
				this.viewable.push(tile);
			}else{
				this.test.push(tile);
			}
		}
		if(i.event)this.events.push(tile);
	}
	removeTile(id){
		let list=[this.tiles,this.viewable,this.collidable,this.events,this.test];
		for(let i of list){
			for(let j=0;j<i.length;j++){
				if(i[j].id==id)i.splice(j--,1);
			}
		}
	}
	async fadeIn(){
		if(game.view.style.opacity==1.0)return;
		for(let i=1;i<=10;i++){
			game.view.style.opacity=i/10;
			await delay(30);
		}
	}
	async fadeOut(){
		if(game.view.style.opacity==0.0)return;
		for(let i=9;i>=0;i--){
			game.view.style.opacity=i/10;
			await delay(30);
		}
	}
	empty(){
		this.background=null;
		this.tiles=[];
		this.viewable=[];
		this.collidable=[];
		this.events=[];
		this.test=[];
	}
	getCollidable(){
		return this.collidable;
	}
	draw(){
		if(this.background){
			game.ctx.drawImage(this.background,0,0);
		}else{
			game.ctx.fillStyle="#87cefa";
			game.ctx.fillRect(0,0,game.width,game.height);
		}
		for(let i of this.viewable){
			i.draw();
		}
		for(let i of this.test){
			let pos=game.camera.getDrawPos(i.position);
			let size=i.size;
			game.ctx.fillStyle='#a020f0';
			game.ctx.fillRect(pos.x,pos.y,size.x,size.y);
		}
		if(this.fade){
			this.fade=false;
			this.fadeIn();
		}
	}
}
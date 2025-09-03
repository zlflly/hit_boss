class Camera{
	constructor(entity){
		this.entity=entity;
		this.position=new Vector(entity.position);
		this.offset=new Vector(game.width/2,game.height/3);
	}
	attach(entity){
		this.entity=entity;
		this.position=new Vector(entity.position);
	}
	reset(){
		this.position.set(this.entity.position);
	}
	setBound(bound){
		this.boundary=bound;
	}
	update(delta){
		let pos=this.position;
		let pos2=this.entity.position;
		let bound=this.boundary;
		pos.x+=(pos2.x-pos.x)*0.1;
		if(Math.abs(pos.x-pos2.x)<0.5){
			pos.x=pos2.x;
		}
		pos.y=pos2.y;
		pos.x=Math.max(pos.x,bound[0]);
		pos.x=Math.min(pos.x,bound[1]);
		pos.y=Math.max(pos.y,bound[2]);
		pos.y=Math.min(pos.y,bound[3]);
		
	}
	getDrawPos(pos){
		let cpos=this.position;
		let off=this.offset;
		return new Vector(pos.x-cpos.x+off.x,pos.y-cpos.y+off.y);
	}
}
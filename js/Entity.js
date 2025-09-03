class Entity{
	constructor(size,animationMachine){
		this.position=new Vector();
		this.remainder=new Vector();
		this.velocity=new Vector();
		this.anchor=new Vector();
		this.size=size;
		this.facing=-1;
		this.animationMachine=animationMachine;
	}
	get hitbox(){
		let pos=this.position;
		let anchor=this.anchor;
		let size=this.size;
		let hitboxPos=pos.sub(size.mul(anchor));
		return new Rect(hitboxPos,size);
	}
	rigidMove(delta,hitboxes,callback){
		delta.addEqual(this.remainder);
		let move=delta.round();
		this.remainder.set(delta.sub(move));
		if(move.x!=0){
			if(this.moveH(move.x,hitboxes)&&typeof(callback)=='function'){
				callback('H');
			}
		}
		if(move.y!=0){
			if(this.moveV(move.y,hitboxes)&&typeof(callback)=='function'){
				callback('V');
			}
		}
	}
	moveH(d,hitboxes){
		let dir=Math.sign(d);
		let pos=this.position;
		let hitbox=this.hitbox;
		for(let i=0;i!=d;i+=dir){
			hitbox.position.addEqual(dir,0);
			let collided=false;
			for(let j of hitboxes){
				if(hitbox.containsRect(j)){
					collided=true;
				}
			}
			if(collided)return true;
			pos.addEqual(dir,0);
		}
		return false;
	}
	moveV(d,hitboxes){
		let dir=Math.sign(d);
		let pos=this.position;
		let hitbox=this.hitbox;
		for(let i=0;i!=d;i+=dir){
			hitbox.position.addEqual(0,dir);
			let collided=false;
			for(let j of hitboxes){
				if(hitbox.containsRect(j)){
					collided=true;
				}
			}
			if(collided)return true;
			pos.addEqual(0,dir);
		}
		return false;
	}
	setUpdate(callback){
		this.update=callback;
	}
	draw(){
		let pos=game.camera.getDrawPos(this.hitbox.position);
		this.animationMachine.draw(pos,this.facing==1);
	}
}
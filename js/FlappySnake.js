class Snake{
	static IMG={
		"snake":"img/snake/snake.png",
		"background":"img/snake/background.png",
		"pipe_up":"img/snake/pipe_up.png",
		"pipe_down":"img/snake/pipe_down.png",
		"food":"img/snake/food.png"
	};
	static DIR=[[0,-1],[1,0],[0,1],[-1,0]];
	static SPEED=2.5;
	static PIPE_COOLDOWN=480;
	static INVINCIBLE_FRAME=60;
	constructor(){
		
	}
	async init(){
		this.body=[];
		this.pipes=[];
		this.pipeCooldown=0;
		this.invincible=0;
		
		this.img={};
		for(let i of Object.keys(Snake.IMG)){
			this.img[i]=await game.dataManager.loadImg(Snake.IMG[i]);
		}
		
		let head=new Body(576,480,1,this.img.snake,this,0);
		let bg=new Background(this.img.background);
		let food=new Food(this.img.food);
		food.position.set(704,480);
		
		this.body.push(head);
		this.background=bg;
		this.food=food;
	}
	getDir(){
		let config=game.inputManager.config;
		let l=config.Left;
		let r=config.Right;
		let u=config.Up;
		let d=config.Down;
		let input=game.inputManager.getRecentInput(e=>{
			return [l,r,u,d].indexOf(KEYMAP[e.keyCode])!=-1;
		});
		if(!input)return false;
		switch(KEYMAP[input.keyCode]){
			case u:return 0;
			case r:return 1;
			case d:return 2;
			case l:return 3;
		}
	}
	async run(){
		let head=this.body[0];
		let dir=this.getDir();
		if(dir!==false&&dir!=head.dir){
			head.dir=dir;
			head.addPathPoint();
		}
		
		if(head.containsRect(this.food)){
			let tail=this.body[this.body.length-1];
			let pos=tail.position;
			let newTail=new Body(pos.x,pos.y,tail.dir,this.img.snake,this,this.body.length);
			this.body.push(newTail);
			while(head.containsRect(this.food))this.food.reset();
		}
		
		if(this.pipeCooldown<=0){
			this.pipes.push(new Pipe(this.img.pipe_up,this.img.pipe_down));
			this.pipeCooldown=Snake.PIPE_COOLDOWN;
		}else{
			this.pipeCooldown--;
		}
		
		if(this.invincible<=0){
			let collide=false;
			for(let i of this.body){
				for(let j of this.pipes){
					if(i.containsRect(j.up)||i.containsRect(j.down)){
						collide=true;
						break;
					}
				}
				if(collide)break;
			}
			if(collide){
				this.resolve(this.body.length-1);
				return;
				/*
				if(this.body.length==1){
					this.resolve();
					return;
				}
				this.body.pop();
				this.invincible=Snake.INVINCIBLE_FRAME;
				*/
			}
		}else{
			this.invincible--;
		}
		
		for(let i of this.body)i.move();
		this.background.move();
		for(let i of this.pipes)i.move();
		
		this.draw();
		
		setTimeout(this.run.bind(this),16.6667);
	}
	draw(){
		this.background.draw();
		this.food.draw()
		for(let i of this.pipes)i.draw();
		for(let i=this.body.length-1;i>=0;i--)this.body[i].draw();
	}
}

class Body extends Rect{
	constructor(x,y,dir,img,snake,i){
		let size=img.width;
		super(x,y,size,size);
		this.img=img;
		this.snake=snake;
		this.i=i;
		this.dir=dir;
		this.pathPoint=[];
	}
	addPathPoint(){
		if(this.snake.body.length<=1)return;
		this.snake.body[1].pathPoint.push({
			'x':this.position.x,
			'y':this.position.y,
			'dir':this.dir
		});
	}
	isBlock(){
		let x1=this.position.x;
		let y1=this.position.y;
		let x2=x1+this.img.width;
		let y2=y1+this.img.width;
		
		if(this.dir==0&&y1==0);
		else if(this.dir==1&&x2==game.width);
		else if(this.dir==2&&y2==game.height);
		else if(this.dir==3&&x1==0);
		else return false;
		return true;
	}
	move(){
		let delta=Snake.SPEED;
		if(this.i>0){
			let x=this.position.x;
			let y=this.position.y;
			let dist=0;
			for(let i of this.pathPoint){
				dist+=Math.abs(i.x-x)+Math.abs(i.y-y);
				x=i.x;y=i.y;
			}
			let front=this.snake.body[this.i-1];
			let pos2=front.position;
			dist+=Math.abs(pos2.x-x)+Math.abs(pos2.y-y);
			if(dist<this.img.width+delta){
				if(!front.isBlock())return;
			}else{
				delta=dist-this.img.width;
			}
		}
		while(this.pathPoint.length>0){
			let x=this.position.x;
			let y=this.position.y;
			let point=this.pathPoint[0];
			let dist=Math.abs(point.x-x)+Math.abs(point.y-y);
			if(delta>=dist){
				delta-=dist;
				this.position.set(point.x,point.y);
				this.dir=point.dir;
				this.pathPoint.shift();
				if(this.i<this.snake.body.length-1){
					this.snake.body[this.i+1].pathPoint.push(point);
				}
			}else{
				break;
			}
		}
		if(delta>0){
			let x=this.position.x;
			let y=this.position.y;
			let mx=Snake.DIR[this.dir][0]*delta;
			let my=Snake.DIR[this.dir][1]*delta;
			let size=this.img.width;
			x+=mx;y+=my;
			if(x<0)x=0;
			else if(y<0)y=0;
			else if(x+size>game.width)x=game.width-size;
			else if(y+size>game.height)y=game.height-size;
			this.position.set(x,y);
		}
	}
	draw(){
		let pos=this.position;
		game.ctx.drawImage(this.img,pos.x,pos.y);
	}
}

class Background{
	static SPEED=2;
	constructor(img){
		this.img=img;
		this.width=this.img.width;
		this.x=0;
	}
	move(){
		this.x-=Background.SPEED;
		if(this.x<=-this.width)this.x=0;
	}
	draw(){
		game.ctx.drawImage(this.img,this.x,0);
		game.ctx.drawImage(this.img,this.x+this.width,0);
	}
}

class Pipe{
	static SPEED=1;
	constructor(img1,img2){
		this.img=[img1,img2];
		let h=img1.height;
		let w=img1.width;
		let gap=parseInt(Math.random()*500);
		this.up=new Rect(game.width,gap-h,w,h);
		this.down=new Rect(game.width,gap+120,w,h);
	}
	move(){
		this.up.position.x-=Pipe.SPEED;
		this.down.position.x-=Pipe.SPEED;
	}
	draw(){
		let pos1=this.up.position;
		let pos2=this.down.position;
		game.ctx.drawImage(this.img[0],pos1.x,pos1.y);
		game.ctx.drawImage(this.img[1],pos2.x,pos2.y);
	}
}

class Food extends Rect{
	static BORDER=100;
	constructor(img){
		let w=img.width;
		let h=img.height;
		super(0,0,w,h);
		this.img=img;
	}
	reset(){
		let b=Food.BORDER;
		let w=this.img.width;
		let h=this.img.height;
		let x=parseInt(Math.random()*(game.width-b*2-w));
		let y=parseInt(Math.random()*(game.height-b*2-h));
		this.position.set(b+x,b+y);
	}
	draw(){
		let pos=this.position;
		game.ctx.drawImage(this.img,pos.x,pos.y);
	}
}
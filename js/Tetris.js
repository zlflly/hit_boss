class Tetris{
	static Rect=[490,90,300,600];
	static FallTime=40;
	static LockTime=60;
	static LockLimit=10;
	static DAS=7;
	static ARR=1;
	static SRS=[
		[[0,0],[0,1],[-1,1],[2,0],[2,1]],
		[[0,0],[0,-1],[1,-1],[-2,0],[-2,-1]],
		[[0,0],[0,-1],[-1,-1],[2,0],[2,-1]],
		[[0,0],[0,1],[1,1],[-2,0],[-2,1]]
	];
	static SRS_I=[
		[[0,0],[0,-1],[0,2],[-2,-1],[1,2]],
		[[0,0],[0,-2],[0,1],[1,-2],[-2,1]],
		[[0,0],[0,1],[0,-2],[2,1],[-1,-2]],
		[[0,0],[0,2],[0,-1],[-1,2],[2,-1]]
	];
	constructor(){
		//创建高40宽10的空白场地
		this.map=Array.from(new Array(40),()=>new Array(10).fill(0));
		this.next=[];
		this.bag=[];
		this.input={};
		this.inputHistory={};
		this.canHold=true;
		this.fallTimer=Tetris.FallTime;
		this.lockTimer=Tetris.LockTime;
		this.lockLimit=Tetris.LockLimit;
		this.DASTimer=Tetris.DAS;
		this.ARRTimer=Tetris.ARR;
		this.timer=3600;
		this.score=0;
		for(let i=0;i<6;i++){
			this.pushNext();
		}
		this.current=this.next.shift();
	}
	async init(){
		this.texture=await game.dataManager.loadImg('img/tetris/skin.png');
		this.border=await game.dataManager.loadImg('img/tetris/border.png');
		this.bg=await game.dataManager.loadImg('img/cg/1-9.jpg');
	}
	async start(){
		await new Promise(resolve=>{
			this.resolve=resolve;
			this.loop=setInterval(()=>{
				this.run();
				this.draw();
			},16.6667);
		});
		clearInterval(this.loop);
		return this.score;
	}
	get onGround(){
		this.current.position[0]++;
		if(this.checkCollide()){
			this.current.position[0]--;
			return true;
		}
		this.current.position[0]--;
		return false;
	}
	pushNext(){
		if(this.bag.length==0){
			this.bag=new Array(7).fill(0).map((v,i,a)=>i);
		}
		let i=Math.floor(Math.random()*this.bag.length);
		i=this.bag.splice(i,1)[0];
		let block=new Block(i);
		this.next.push(block);
	}
	hold(){
		this.current.respawn();
		if(!this.onHold){
			this.onHold=this.current;
			this.pushNext();
			this.current=this.next.shift();
		}else{
			let swap=this.onHold;
			this.onHold=this.current;
			this.current=swap;
		}
		this.canHold=false;
		this.fallTimer=Tetris.FallTime;
		this.lockTimer=Tetris.LockTime;
		this.lockLimit=Tetris.LockLimit;
		this.ARRTimer=Tetris.ARR;
	}
	lock(){
		let cur=this.current;
		let shape=cur.shapes[cur.rotate];
		for(let i=0;i<4;i++){
			for(let j=0;j<4;j++){
				if(shape[i][j]!=0){
					let line=i-cur.pivot[0]+cur.position[0];
					let row=j-cur.pivot[1]+cur.position[1];
					this.map[line][row]=cur.color;
				}
			}
		}
		this.pushNext();
		this.current=this.next.shift();
		if(this.checkCollide()){
			this.resolve();
			return;
		}
		
		this.canHold=true;
		this.fallTimer=Tetris.FallTime;
		this.lockTimer=Tetris.LockTime;
		this.lockLimit=Tetris.LockLimit;
		this.ARRTimer=Tetris.ARR;
	}
	checkCollide(block){
		let cur=block||this.current;
		let shape=cur.shapes[cur.rotate];
		for(let i=0;i<4;i++){
			for(let j=0;j<4;j++){
				if(shape[i][j]!=0){
					let line=i-cur.pivot[0]+cur.position[0];
					let row=j-cur.pivot[1]+cur.position[1];
					if(line<0||line>=40||row<0||row>=10)return true;
					if(this.map[line][row]!=0)return true;
				}
			}
		}
		return false;
	}
	clear(){
		let lines=0;
		for(let i=0;i<40;i++){
			let full=true;
			for(let j=0;j<10;j++){
				if(this.map[i][j]==0){
					full=false;
					break;
				}
			}
			if(full){
				lines++;
				this.map.splice(i,1);
				this.map.unshift(new Array(10).fill(0));
			}
		}
		this.score+=lines;
	}
	getInput(){
		let config=game.inputManager.config;
		let his=this.inputHistory;
		let moveX=game.inputManager.getMoveX();
		let down=game.inputManager.getRecentInput(config.Down);
		let rotateL=game.inputManager.getRecentInput(config.RotateL);
		let rotateR=game.inputManager.getRecentInput(config.RotateR);
		let hold=game.inputManager.getRecentInput(config.Dash);
		let hardDrop=game.inputManager.getRecentInput(config.HardDrop);
		
		if(moveX!=his.moveX){
			his.moveX=moveX;
			this.input.moveX=moveX;
			this.DASTimer=Tetris.DAS;
			this.ARRTimer=Tetris.ARR;
			this.move(moveX);
		}else if(this.DASTimer>0){
			this.DASTimer--;
		}
		if(down){
			this.input.down=true;
		}else{
			this.input.down=false;
		}
		if(rotateL&&rotateL.timeStamp!=his.rotateL){
			his.rotateL=rotateL.timeStamp;
			this.rotate('L');
		}
		if(rotateR&&rotateR.timeStamp!=his.rotateR){
			his.rotateR=rotateR.timeStamp;
			this.rotate('R');
		}
		if(this.canHold&&hold&&hold.timeStamp!=his.hold){
			his.hold=hold.timeStamp;
			this.hold();
		}
		if(hardDrop&&hardDrop.timeStamp!=his.hardDrop){
			his.hardDrop=hardDrop.timeStamp;
			this.hardDrop();
		}
	}
	move(dir){
		if(dir==0)return false;
		switch(dir){
		case -1:
			this.current.position[1]--;
			if(this.checkCollide()){
				this.current.position[1]++;
				return false;
			}
			break;
		case 1:
			this.current.position[1]++;
			if(this.checkCollide()){
				this.current.position[1]--;
				return false;
			}
			break;
		case "down":
			this.current.position[0]++;
			if(this.checkCollide()){
				this.current.position[0]--;
				return false;
			}
			break;
		}
		if(this.onGround){
			this.lockTimer=Tetris.LockTime;
			if(this.ARRTimer>0){
				this.lockLimit--;
			}
		}
		return true;
	}
	rotate(dir){
		let cur=this.current;
		let rot=cur.rotate;
		let srs=cur.color==7?Tetris.SRS_I:Tetris.SRS;
		switch(dir){
		case "L":
			cur.rotate=(cur.rotate+1)%4;
			for(let i=0;i<5;i++){
				cur.position[0]+=srs[rot][i][0];
				cur.position[1]+=srs[rot][i][1];
				if(!this.checkCollide()){
					break;
				}else{
					cur.position[0]-=srs[rot][i][0];
					cur.position[1]-=srs[rot][i][1];
					if(i==4){
						cur.rotate=rot;
						return false;
					}
				}
			}
			break;
		case "R":
			cur.rotate=(cur.rotate+3)%4;
			for(let i=0;i<5;i++){
				cur.position[0]-=srs[cur.rotate][i][0];
				cur.position[1]-=srs[cur.rotate][i][1];
				if(!this.checkCollide()){
					break;
				}else{
					cur.position[0]+=srs[cur.rotate][i][0];
					cur.position[1]+=srs[cur.rotate][i][1];
					if(i==4){
						cur.rotate=rot;
						return false;
					}
				}
			}
			break;
		}
		if(this.onGround){
			this.lockTimer=Tetris.LockTime;
			this.lockLimit--;
		}
		return true;
	}
	hardDrop(){
		while(this.move("down"));
		this.lock();
	}
	run(){
		if(this.timer<=0){
			this.resolve();
		}
		this.getInput();
		if(this.input.moveX!=0&&this.DASTimer<=0){
			if(this.ARRTimer<=0){
				this.move(this.input.moveX);
				this.ARRTimer=Tetris.ARR;
			}else{
				this.ARRTimer--;
			}
		}
		let gravity=this.input.down?20:1;
		
		if(this.onGround){
			if(this.lockTimer<=0||this.lockLimit<=0){
				this.lock();
			}else{
				this.lockTimer--;
			}
		}else if(this.fallTimer<=0){
			this.move("down");
			this.fallTimer=Tetris.FallTime;
		}else{
			this.fallTimer-=gravity;
		}
		this.clear();
		this.timer--;
	}
	draw(){
		game.ctx.drawImage(this.bg,0,0,this.bg.width,this.bg.height,0,0,game.width,game.height);
		game.ctx.drawImage(this.border,Tetris.Rect[0]-(this.border.width-Tetris.Rect[2])/2,Tetris.Rect[1]);
		for(let i=0;i<40;i++){
			for(let j=0;j<10;j++){
				this.drawBlock(j*30+Tetris.Rect[0],(i-20)*30+Tetris.Rect[1],this.map[i][j]);
			}
		}
		if(this.onHold){
			if(this.canHold){
				this.drawShape(this.onHold,[260,207]);
			}else{
				this.drawShape(this.onHold.shadow(),[260,207]);
			}
		}
		for(let i=0;i<5;i++){
			this.drawShape(this.next[i],[720,207+75*i]);
		}
		game.ctx.font="50px Arial";
		game.ctx.fillText(Math.ceil(this.timer/60)+'s',370,320);
		let shadow=this.current.shadow();
		while(!this.checkCollide(shadow)){
			shadow.position[0]++;
		}
		shadow.position[0]--;
		this.drawShape(shadow);
		this.drawShape(this.current);
	}
	drawBlock(x,y,color){
		if(color==0)return;
		game.ctx.drawImage(this.texture,(color-1)*30,0,30,30,x,y,30,30);
	}
	drawShape(cur,pos){
		pos=pos||Tetris.Rect;
		let shape=cur.shapes[cur.rotate];
		for(let i=0;i<4;i++){
			for(let j=0;j<4;j++){
				if(shape[i][j]!=0){
					let line=i-cur.pivot[0]+cur.position[0];
					let row=j-cur.pivot[1]+cur.position[1];
					this.drawBlock(row*30+pos[0],(line-20)*30+pos[1],cur.color);
				}
			}
		}
	}
}

class Block{
	static Blocks=['Z','S','T','L','J','O','I'];
	static Pivot=[[1,1],[1,1],[1,1],[1,1],[1,1],[1.5,1.5],[1.5,1.5]];
	static Spawn=[[19,4],[19,4],[19,4],[19,4],[19,4],[18.5,4.5],[19.5,4.5]];
	static Z=[
		[[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
		[[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
	];
	static S=[
		[[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
		[[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
	];
	static T=[
		[[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
	];
	static L=[
		[[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
	];
	static J=[
		[[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
		[[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
		[[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
	];
	static O=[
		[[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
		[[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
		[[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
		[[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
	];
	static I=[
		[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
		[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
		[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
		[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
	];
	constructor(i){
		this.color=i+1;
		this.rotate=0;
		this.shapes=Block[Block.Blocks[i]];
		this.pivot=Block.Pivot[i].slice(0);
		this.position=Block.Spawn[i].slice(0);
	}
	respawn(){
		this.rotate=0;
		this.position=Block.Spawn[this.color-1].slice(0);
	}
	shadow(){
		let block=new Block(this.color-1);
		block.color=8;
		block.rotate=this.rotate;
		block.position=this.position.slice(0);
		return block;
	}
}
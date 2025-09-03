class EventManager{
	constructor(){
		this.event=null;
		this.progress=null;
	}
	set(e){
		this.event=e;
		this.progress='start';
	}
	add(e){
		if(!this.event){
			this.set(e);
			return;
		}
		if(!this.event.next)this.event.next=[];
		this.event.next.unshift(e);
	}
	async handle(){
		if(this.progress!='start')return;
		let e=this.event;
		this.progress='processing';
		
		game.noel.blockMove=true;
		
		switch(e.type){
		case "delay":
			await delay(e.time);
			break;
		case "dialog":
			await game.dialog.prints(e.text);
			break;
		case "fadeIn":
			await game.mapManager.fadeIn();
			break;
		case "fadeOut":
			await game.mapManager.fadeOut();
			break;
		case "turn":
			game.noel.facing=e.facing;
			break;
		case "changeMap":
			await game.mapManager.loadMap(e.target);
			
			game.noel.position.set(...e.playerStatus.position);
			game.noel.facing=e.playerStatus.facing;
			
			game.saveManager.save();
			
			game.camera.reset();
			break;
		case "setRespawn":
			game.saveManager.data.respawnPos=e.position;
			break;
		case "respawn":
			await game.mapManager.fadeOut();
			let pos=game.saveManager.data.respawnPos;
			game.noel.position.set(pos[0],pos[1]);
			await game.mapManager.fadeIn();
			break;
		case "snake":
			game.status="minigame";
			await game.mapManager.fadeOut();
			game.mapManager.fade=true;
			game.ctx.clearRect(0,0,game.width,game.height);
			await startMinigame1();
			game.status="running";
			break;
		case "tetris":
			game.status="minigame";
			await game.mapManager.fadeOut();
			game.mapManager.fade=true;
			game.ctx.fillStyle='white';
			game.ctx.fillRect(0,0,game.width,game.height);
			await startMinigame2();
			game.status="running";
			break;
		case "showCG":
			game.status="CG";
			let img=await game.dataManager.loadImg(e.src);
			game.ctx.drawImage(img,0,0,img.width,img.height,0,0,game.width,game.height);
			await game.mapManager.fadeIn();
			break;
		case "hideCG":
			await game.mapManager.fadeOut();
			game.status="running";
			break;
		case "addTile":
			await game.mapManager.addTile(e.tile);
			break;
		case "removeTile":
			game.mapManager.removeTile(e.id);
			break;
		case "unlockDash":
			game.saveManager.data.canDash=true;
			break;
		case "achieve":
			if(!game.saveManager.hasAchieve(e.id)){
				game.saveManager.achieve(e.id);
				let achi=new Achieve(e.src,e.title);
				await achi.init();
			}
			break;
		case "over":
			game.status="end";
			await over();
			game.saveManager.addFlag(['over']);
			game.saveManager.save(true);
			window.location.href="index.html";
			break;
		case "end":
			game.status="end";
			await end();
			window.location.href="index.html";
			break;
		default:break;
		}
		
		game.noel.blockMove=false;
		
		game.saveManager.addFlag(e.flag);
		if(e.next&&e.next.length>0){
			let next=e.next.shift();
			next.next=e.next;
			this.set(next);
		}else{
			this.event=null;
			this.progress='end';
		}
	}
}
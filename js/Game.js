class Game{
	constructor(){
		this.init();
	}
	async init(){
		this.gameFrame=0;
		this.status="running";
		
		this.createStage();
		this.dialog=new Dialog();
		this.dataManager=new DataManager();
		this.inputManager=new InputManager();
		this.eventManager=new EventManager();
		this.saveManager=new SaveManager();
		
		let s1=await this.dataManager.loadSpritesheet('img/mouse2/whitemouse.json');
		let s2=await this.dataManager.loadSpritesheet('img/mouse2/whitemouse.json');
		
		this.noel=new Noel(s1,s2);
		// await this.noel.loadHintImg(); // 缺失 img/point.png 时临时注释，避免 404
		
		// 创建Boss（使用单张图片）
		let bossImage=await this.dataManager.loadImg('img/boss/image.png');
		this.boss=new Boss(bossImage);
		this.boss.position.set(800,400); // Boss在地图右侧
		
		this.mapManager=new MapManager();
		
		this.camera=new Camera(this.noel);
		
		await this.saveManager.load();
		
		this.update();
	}
	createStage(){
		this.width=1280;
		this.height=720;
		
		this.view=document.createElement('canvas');
		this.view.width=this.width;
		this.view.height=this.height;
		this.view.style.position="absolute";
		this.view.style.display="block";
		this.view.style.margin="auto";
		this.view.style.inset=0;
		this.autoScale(this.view);
		
		this.ctx=this.view.getContext('2d');
		
		document.getElementById('game').appendChild(this.view);
	}
	autoScale(view){
		let scale=Math.min(window.innerWidth/view.width,window.innerHeight/view.height);
		if(Math.abs(scale-1)<0.005)scale=1;
		view.style.width=view.width*scale+'px';
		view.style.height=view.height*scale+'px';
	}
	update(delta){
		this.autoScale(this.view);
		
		switch(this.status){
		case "running":
			this.camera.update(delta);
			this.mapManager.draw();
			this.noel.update(delta);
			this.noel.draw();
			this.boss.update(delta);
			this.boss.draw();
			break;
		}
		
		if(this.status!='pause'&&this.eventManager.event&&this.eventManager.progress=='start'){
			this.eventManager.handle();
		}
		
		this.gameFrame++;
		
		setTimeout(this.update.bind(this),16.6667);
	}
}
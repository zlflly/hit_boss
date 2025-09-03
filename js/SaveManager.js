class SaveManager{
	constructor(){
		this.makeEmptyData();
	}
	makeEmptyData(){
		this.data={
			"player":{
				"room":"map/new_new_map.json",
				"position":[100,500],
				"facing":1,
				"blockEvent":false
			},
			"flag":[],
			"canDash":false
		};
	}
	async load(){
		let user=localStorage.getItem('BITeli-username')||'default';
		let data=localStorage.getItem('BITeli-save-'+user);
		if(data){
			this.data=JSON.parse(data);
			// 强制使用新地图
			this.data.player.room="map/new_new_map.json";
		}else{
			this.makeEmptyData();
		}
		
		let e={};
		let player=this.data.player;
		e.type="changeMap",
		e.target=player.room;
		e.playerStatus=player;
		game.noel.blockEvent=player.blockEvent;
		
		game.eventManager.set(e);
		game.dialog.cancel();
		await game.eventManager.handle();
	}
	save(direct=false){
		let user=localStorage.getItem('BITeli-username')||'default';
		if(!direct){
			let noel=game.noel;
			let pos=noel.position;
			this.data.player.room=game.mapManager.current;
			this.data.player.position=[pos.x,pos.y];
			this.data.player.facing=noel.facing;
			this.data.player.blockEvent=true;
		}
		localStorage.setItem('BITeli-save-'+user,JSON.stringify(this.data));
	}
	reset(){
		let user=localStorage.getItem('BITeli-username')||'default';
		this.makeEmptyData();
		localStorage.setItem('BITeli-save-'+user,JSON.stringify(this.data));
	}
	hasFlag(key){
		let not=key[0]=='!';
		if(not)key=key.split('').slice(1).join('');
		let index=this.data.flag.indexOf(key);
		return not?index==-1:index!=-1;
	}
	addFlag(flags){
		if(!flags)return;
		for(let i of flags){
			if(!this.hasFlag(i)){
				this.data.flag.push(i);
			}
		}
	}
	checkFilter(e){
		if(!e.filter)return true;
		for(let i of e.filter){
			if(!this.hasFlag(i))return false;
		}
		return true;
	}
	achieve(id){
		let user=localStorage.getItem('BITeli-username')||'default';
		let achi=JSON.parse(localStorage.getItem('BITeli-achi-'+user)||'{}');
		achi[id]=true;
		localStorage.setItem('BITeli-achi-'+user,JSON.stringify(achi));
	}
	hasAchieve(id){
		let user=localStorage.getItem('BITeli-username')||'default';
		let achi=JSON.parse(localStorage.getItem('BITeli-achi-'+user)||'{}');
		return achi[id];
	}
}
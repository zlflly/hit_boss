async function startMinigame1(){
	let dialog=true;
	while(true){
		window.snake=new Snake();
		await snake.init();
		snake.draw();
		await game.mapManager.fadeIn();
		if(dialog){
			await game.dialog.prints([
				"玩法说明：画面中的黑边实心矩形为你，黑边方括号为食物",
				"使用方向键转向，触碰并吃下食物，增加你的长度",
				"同时躲避画面中的绿色管道",
				"注意，除了绿色管道，没有任何事物能伤害你",
				"你甚至可以把自己打结，或者在屏幕边缘停留",
				"得到10分即可通关，通关为获得真结局必要条件",
				"*游戏开始"
			]);
			dialog=false;
		}
		let score=await new Promise(resolve=>{
			snake.resolve=resolve;
			snake.run();
		});
		
		let restart=false;
		let handler=(e)=>{
			if(KEYMAP[e.keyCode]=='R'){
				restart=true;
				game.dialog.cancel();
				document.removeEventListener("keydown",handler);
			}
		};
		document.addEventListener("keydown",handler);
		if(score<10){
			await game.dialog.prints([
				"游戏结束，很遗憾，您仅获得了"+score+"分",
				"您可以按下R键重新开始游戏"
			]);
		}else if(score<20){
			game.eventManager.add({"type":"achieve","src":"img/achi/bird.png","title":"贪吃蛇？","id":"snake1"});
			await game.dialog.prints([
				"游戏结束，您获得了"+score+"分，恭喜通关",
				"您可以按下R键重新开始游戏，尝试挑战获得20以上的高分，获取相关成就"
			]);
		}else{
			game.eventManager.add({"type":"achieve","src":"img/achi/python.png","title":"尘世巨蟒","id":"snake2"});
			game.eventManager.add({"type":"achieve","src":"img/achi/bird.png","title":"贪吃蛇？","id":"snake1"});
			await game.dialog.prints([
				"恭喜，你获得了"+score+"分，您已完全通关该游戏！",
				"您依然可以按下R键重新游玩小游戏"
			]);
		}
		document.removeEventListener("keydown",handler);
		if(restart)continue;
		
		await game.mapManager.fadeOut();
		break;
	}
}

async function startMinigame2(){
	let dialog=true;
	while(true){
		window.tetris=new Tetris();
		await tetris.init();
		tetris.draw();
		await game.mapManager.fadeIn();
		if(dialog){
			let config=game.inputManager.config;
			await game.dialog.prints([
				"玩法说明：游戏画面为20格高，10格宽的矩形",
				"你可以使用七种不同的代码块拼接组成程序",
				"当场地上任何一行10格填满时，该行程序将消除并发布",
				"右侧为代码块预览，左侧为代码仓库",
				"你可以按下暂存键，将代码块放入仓库，需要时再取出",
				"游戏限时60秒，消除10行即通关，通关为获得真结局必要条件",
				"按键提醒	左："+config.Left+"	右："+config.Right+"	下："+config.Down,
				"逆时针旋转："+config.RotateL+"	顺时针旋转："+config.RotateR,
				"暂存："+config.Dash+"	硬降："+config.HardDrop,
				"*游戏开始"
			]);
			dialog=false;
		}
		let score=await tetris.start();
		
		let restart=false;
		let handler=(e)=>{
			if(KEYMAP[e.keyCode]=='R'){
				restart=true;
				game.dialog.cancel();
				document.removeEventListener("keydown",handler);
			}
		};
		document.addEventListener("keydown",handler);
		if(score<10){
			await game.dialog.prints([
				"游戏结束，很遗憾，您仅消除了"+score+"行",
				"您可以按下R键重新开始游戏"
			]);
		}else if(score<30){
			game.eventManager.add({"type":"achieve","src":"img/achi/tetris.png","title":"再接再厉","id":"tetris1"});
			await game.dialog.prints([
				"游戏结束，您消除了"+score+"行，恭喜通关",
				"您可以按下R键重新开始游戏，尝试挑战消除30行，获取相关成就"
			]);
		}else{
			game.eventManager.add({"type":"achieve","src":"img/achi/TETRIO.png","title":"欢迎入门","id":"tetris2"});
			game.eventManager.add({"type":"achieve","src":"img/achi/tetris.png","title":"再接再厉","id":"tetris1"});
			await game.dialog.prints([
				"恭喜，您消除了"+score+"行，恭喜您入门该游戏",
				"您依然可以按下R键重新游玩小游戏",
				"但我更建议您游玩TETR.IO、Techmino等更优秀的作品"
			]);
		}
		document.removeEventListener("keydown",handler);
		if(restart)continue;
		
		await game.mapManager.fadeOut();
		break;
	}
}
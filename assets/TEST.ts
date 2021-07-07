
import { _decorator, Component, Node, macro, dynamicAtlasManager, Sprite } from 'cc';
import DAM from './DAM';
const { ccclass, property } = _decorator;
dynamicAtlasManager.enabled = false;
window["SURD"] = (s: any) => {
    if (s instanceof Sprite) DAM.I().Add(s);
    //else if (s instanceof cc.Label) DAM.I().AddB(s);
}
@ccclass('TEST')
export class TEST extends Component {

    start() {
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
    lateUpdate() {//packToDynamicAtlas
        DAM.I().update();
    }
    showdebug() {
        DAM.I().showDebug();
    }
}

/**
 * [1] Class member could be defined like this.
 * [2] Use `property` decorator if your want the member to be serializable.
 * [3] Your initialization goes here.
 * [4] Your update function goes here.
 *
 * Learn more about scripting: https://docs.cocos.com/creator/3.0/manual/en/scripting/
 * Learn more about CCClass: https://docs.cocos.com/creator/3.0/manual/en/scripting/ccclass.html
 * Learn more about life-cycle callbacks: https://docs.cocos.com/creator/3.0/manual/en/scripting/life-cycle-callbacks.html
 */

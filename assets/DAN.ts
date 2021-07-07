import { Component, _decorator } from 'cc';
import DAM from './DAM';

//动态合图节点
const { ccclass, property, menu } = _decorator;
@ccclass
@menu("自定义组件/DAN")
export default class DAN extends Component {
    @property
    key: string = '';
    onLoad() {
        DAM.I().AddCite(this.key);
    }
    onDestroy() {
        if (this['_objFlags']) DAM.I().DelCite(this.key);
    }
}

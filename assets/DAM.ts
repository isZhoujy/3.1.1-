import { director, Director, dynamicAtlasManager, Scene, Node, Sprite, Label, SpriteFrame, rect, log, view, macro, ScrollView, UITransform, Vec3, Layout, color, find } from 'cc';
import DA from './DA';
import DAN from './DAN';

//动态合图管理
export default class DAM {
    private static i: DAM = null;
    static I(): DAM {
        if (!DAM.i) {
            if (dynamicAtlasManager) dynamicAtlasManager.enabled = false;
            DAM.i = new DAM();
            DAM.i._enabled = true;
            // setInterval(() => {
            //     DAM.i.CheckCache();
            // }, 2000);
        }
        return DAM.i;
    }

    private _enabled: boolean = true;//开关
    _DAs: { [key: string]: DA } = {};//所有图集
    private _minFrameSize: number = 8;//图片尺寸-最小
    private _maxFrameSize: number = 1024;//图片尺寸-最大

    private _debugNode: Node = null;//调试node

    private _atlasesExtend: { [key: string]: string[] } = {};//主图集与拓展图集关联
    private _cite: { [key: string]: { n: number, t: number } } = {};//图集引用数量与时间
    private _DAC: { [key: string]: number } = {};//每个图集当前使用的图集，图集迭代复用时使用
    //图集分区域阈值 setting: { w:宽,h：高， l: 分区域阈值, a: 分区域分割线位置, m: 最大图集数量(慎用) }
    private _DASet: { [key: string]: { w: number, h: number, l: number, a: number, m: number } } = {
        // "windowFrame": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "LobyUI": { w: 1024, h: 1600, l: 220, a: 512, m: 0 },
        // "TabEqp": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "SkillP": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "DeSkin": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "UpDegr": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // /**cxb */
        // "VipMn": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "Shop": { w: 1024, h: 512, l: 0, a: 0, m: 0 },
        // "RepNode": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "SHall": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // /**cxb */
        // "RealmU": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
        // "RlmRwd": { w: 1024, h: 1024, l: 0, a: 0, m: 0 },
    };

    getAtlas(name: string, settingKey: string): DA {
        let atlas: DA = this._DAs[name];
        if (!atlas) {
            atlas = new DA(this._DASet[settingKey]);
            atlas.DAName = name;
            this._DAs[name] = atlas;
        }
        return atlas;
    }
    beforeSceneLoad() {
        this.reset();
    }
    /**
     * !#en Enabled or Disabled dynamic atlas.
     * !#zh 开启或者关闭动态图集。
     * @property enabled
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }
    set enabled(value: boolean) {
        if (this._enabled === value) return;

        if (value) {
            this.reset();
            director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, this.beforeSceneLoad);
        }
        else {
            director.off(Director.EVENT_BEFORE_SCENE_LAUNCH, this.beforeSceneLoad);
        }

        this._enabled = value;
    }
    /**
     * !#en The maximum size of the picture that can be added to the atlas.
     * !#zh 可以添加进图集的图片的最大尺寸。
     * @property maxFrameSize
     * @type {Number}
     */
    get maxFrameSize(): number {
        return this._maxFrameSize;
    }
    set maxFrameSize(value: number) {
        this._maxFrameSize = value;
    }
    /**
     * !#en The minimum size of the picture that can be added to the atlas.
     * !#zh 可以添加进图集的图片的最小尺寸。
     * @property minFrameSize
     * @type {Number}
     */
    get minFrameSize(): number {
        return this._minFrameSize;
    }
    set minFrameSize(value: number) {
        this._minFrameSize = value;
    }
    Scan(n: Node) {
        this.mark(this.scanKey(n), n);
    }
    private scanKey(n: Node): string {
        let key: string = "";
        let node: Node = n;
        while (key == "") {
            if (!node) { key = "?"; break; }
            if (node instanceof Scene) { key = "?"; break; }
            if (!(node instanceof Node)) { key = "--"; break; }
            if (node.name == "root") { key = "--"; break; }
            let dan = node.getComponent(DAN);
            if (dan) key = dan.key == "" ? "--" : dan.key;
            else node = node.parent;
        }
        return key;
    }
    private mark(key: string, n: Node) {
        //1.递归所有子的cc.Sprite
        //1.给cc.Sprite添加标记
        if (!n) return;
        let s = n.getComponent(Sprite);
        if (s) s["DA"] = key;
        for (let i = 0; i < n.children.length; i++) {
            this.mark(key, n.children[i]);
        }
    }
    unmark(n: Node) {
        let s = n.getComponent(Sprite);
        if (s) {
            delete s["DA"];
        }
        if (n.children.length > 0) {
            for (let i = 0; i < n.children.length; i++) {
                this.unmark(n.children[i]);
            }
        }
    }
    //必须上报的DAN名称
    private mustRepotUI: { [name: string]: boolean } = { "LobyUI": true };
    /**
     * !#en Append a sprite frame into the dynamic atlas.
     * !#zh 添加碎图进入动态图集。
     * @method Add
     * @param {Sprite} Sprite 
     */
    Add(sprite: Sprite) {
        //1.找到DAN节点,找不到放弃
        //2.调用insert,返回null则不作操作,其他则换SpriteFrame
        if (CC_EDITOR) return;
        if (!this._enabled) return;
        if (!sprite.spriteFrame) return;
        if (sprite.spriteFrame["DA"]) return;
        if (!sprite["DA"]) {
            //if (sprite["isAnima"]) { sprite["DA"] == "--"; return; }
            let key = this.scanKey(sprite.node);
            if (key != "?") sprite["DA"] = key;
        }
        if (!sprite["DA"] || sprite["DA"] == "--") {
            return;
        }
        //每三秒内添加图集，连续三次。则停止
        let pt = sprite["prevT"];
        let dt = Date.now();
        if (pt && dt - pt < 3000) {
            if (sprite["prevC"] > 2) {
                sprite["prevT"] = null;
                sprite["prevC"] = null;
                let cmsg = "check atlas:" + sprite.node.name + "," + sprite["DA"];
                if (this.mustRepotUI[sprite["DA"]]) {
                    log(cmsg);
                } else {
                    log(cmsg);
                }

                sprite["DA"] = "--";
                return;
            } else {
                sprite["prevC"]++;
            }
        } else {
            sprite["prevC"] = 0;
        }
        sprite["prevT"] = dt;

        this._waitDo.push({ s: sprite });
        //加入到列表,排队处理
        // let sf = this.insert(sprite["DA"], sprite.spriteFrame);
        // if (sf) {
        //     sprite.spriteFrame = sf;
        // }
    }
    /**
     * !#en Append a AddB into the dynamic atlas.
     * !#zh 添加BMFont图片进入动态图集。
     * @method AddB
     * @param {Label} Label 
     */
    AddB(label: Label) {
        //TODO.. 发现bmfont会打断渲染，并且bmfont的图并不大，预计处理后dc能再降一般，所以支持它在计划中 ~mzc
        //暂时因为font引用的关系，暂搁置这种方案
        return;
        // if (CC_EDITOR) return;
        // if (!this._enabled) return;
        // if (!label.font || !label.font['spriteFrame']) return;
        // let osf = label.font['spriteFrame'];
        // if (osf["DA"]) return;
        // if (!label["DA"]) {
        //     let key = this.scanKey(label.node);
        //     if (key != "?") label["DA"] = key;
        // }
        // if (!label["DA"] || label["DA"] == "--") return;
        // let sf = this.insert(label["DA"], osf);
        // if (sf) {
        //     label.font['spriteFrame'] = sf;
        // }
    }
    /**
     * !#en Append a sprite frame into the dynamic atlas.
     * !#zh 添加碎图进入动态图集。
     * @method insertSpriteFrame
     * @param {SpriteFrame} spriteFrame 
     */
    private insert(key: string, spriteFrame: SpriteFrame): SpriteFrame {
        if (!this._enabled) return null;
        if (!key || !spriteFrame) return null;
        if (spriteFrame['DA']) return null;
        if (!spriteFrame.texture) return null;
        let r = spriteFrame.getRect();
        if (r.width > this.maxFrameSize || r.height > this.maxFrameSize ||
            r.width <= this.minFrameSize || r.height <= this.minFrameSize) {
            return null;
        }
        let kn = key;
        if (!this._DAC[key]) this._DAC[key] = 0;
        let needReset = this._DASet[key] && this._DASet[key].m && this._DASet[key].m > 0;//迭代利用型图集
        let k = needReset ? this._DAC[key] : 0;//迭代利用型图集，从最高的开始，非迭代利用的每次从0开始找复用图片
        let packedFrame = null;
        while (!packedFrame) {
            kn = k > 0 ? key + '~' + k : key;
            let atlas = this.getAtlas(kn, key);
            packedFrame = atlas.insert(spriteFrame);
            if (!packedFrame) {
                k++;
                if (k > 1000) {
                    log(key)
                    break;
                }
                if (needReset) {//迭代利用型
                    //如果图集设有上限，并已经要超过了，迭代到初始利用
                    if (k >= this._DASet[key].m) {
                        k = 0;
                    }
                    //重置被迭代利用的图集
                    let rDA = this._DAs[k > 0 ? key + '~' + k : key];
                    if (rDA) rDA.reset();
                }
            }
        }
        this._DAC[key] = k;

        // if (!packedFrame) {
        //     //     console.log(key + "满了");
        //     return null;
        // }
        if (key != kn) {
            if (this._atlasesExtend[key]) {
                if (this._atlasesExtend[key].indexOf(kn) < 0) {
                    this._atlasesExtend[key].push(kn);
                    //console.error("图集满了", key);
                }
            } else {
                //console.error("图集满了", key);
                this._atlasesExtend[key] = [kn];
            }
        }
        let newspriteFrame: SpriteFrame = new SpriteFrame();
        newspriteFrame.texture = packedFrame.texture;
        newspriteFrame.setRect(rect(packedFrame.x, packedFrame.y, r.width, r.height));
        newspriteFrame.setRotated(spriteFrame.isRotated());
        newspriteFrame.setOffset(spriteFrame.getOffset());
        newspriteFrame.setOriginalSize(spriteFrame.getOriginalSize());
        newspriteFrame['_capInsets'] = spriteFrame['_capInsets'].concat();
        newspriteFrame['_calculateUV']();
        newspriteFrame['_calculateSlicedUV']();
        newspriteFrame["DA"] = kn;

        return newspriteFrame;
    }

    /** 
     * !#en delete a dynamic atlas, and the existing ones will be destroyed.
     * !#zh 删除一张动态图集,有引用的将黑掉,除非你知道你在做什么,否则不要调用
     * @method reset
    */
    private delDA(key: string) {
        if (this._DAs[key]) {
            this._DAs[key].destroy();
            delete this._DAs[key];
        }
    }
    public delDAPrikey(key: string) {
        if (this._DAs[key]) {
            this._DAs[key].destroy();
            delete this._DAs[key];
            if (this._atlasesExtend[key]) {
                for (let i = 0; i < this._atlasesExtend[key].length; i++) {
                    const e = this._atlasesExtend[key][i];
                    this.delDA(e);
                }
                delete this._atlasesExtend[key];
            }
        }
    }
    /** 
     * !#en Resets all dynamic atlas, and the existing ones will be destroyed.
     * !#zh 重置所有动态图集，已有的动态图集会被销毁。
     * @method reset
    */
    private reset() {
        let keys: string[] = [];
        for (const key in this._DAs) {
            keys.push(key);
        }
        for (let index = 0; index < keys.length; index++) {
            this.delDA(keys[index]);
        }
    }
    AddCite(key: string) {
        if (CC_EDITOR) return;
        if (!this._enabled) return null;
        if (key != "") {
            if (this._cite[key]) {
                let d = { n: this._cite[key].n + 1, t: new Date().getTime() };
                this._cite[key] = d;
            } else {
                this._cite[key] = { n: 1, t: new Date().getTime() };
            }
        }
    }
    DelCite(key: string) {
        if (CC_EDITOR) return;
        if (!this._enabled) return null;
        if (key != "") {
            if (this._cite[key]) {
                let d = { n: this._cite[key].n - 1, t: new Date().getTime() };
                this._cite[key] = d;
            }
            if (this._cite[key].n == 0) {
                let d = { n: 0, t: new Date().getTime() };
                this._cite[key] = d;
            }
        }
    }
    private CheckCache(r: boolean = false) {
        if (CC_EDITOR) return;
        if (!this._enabled) return null;
        let dt = 0;//10秒超时
        for (const key in this._cite) {
            if (this._cite[key].n == 0 && this._cite[key].t <= new Date().getTime() - dt) {
                //console.log("自动合图回收", key);
                this.delDA(key);
                if (this._atlasesExtend[key]) {
                    for (let i = 0; i < this._atlasesExtend[key].length; i++) {
                        const e = this._atlasesExtend[key][i];
                        this.delDA(e);
                    }
                    delete this._atlasesExtend[key];
                }
                delete this._cite[key];
            }
        }
    }
    private _waitDo: { s: Sprite }[] = [];
    update() {
        //console.log(this._waitDo.length);
        let timesPerFrame = 0;
        while (this._waitDo.length > 0) {
            let d = this._waitDo.shift();
            if (d) {
                this._do(d.s);
                timesPerFrame++;
                if (timesPerFrame >= 10) {
                    break;
                }
            }
        }
    }

    private _do(s: Sprite) {
        if (s && s["DA"] && s.spriteFrame) {
            let sf = this.insert(s["DA"], s.spriteFrame);
            if (sf) {
                s.spriteFrame = sf;
            }
        }
    }


    /**
     * !#en Displays all the dynamic atlas in the current scene, which you can use to view the current atlas state.
     * !#zh 在当前场景中显示所有动态图集，可以用来查看当前的合图状态。
     * @method showDebug
     * @param {Boolean} show
     */
    showDebug(): any {
        if (CC_EDITOR) return;
        if (!this._enabled) return null;
        let show = this._debugNode == null;
        if (show) {
            if (!this._debugNode || !this._debugNode.isValid) {
                let width = view.getFrameSize().width;
                let height = view.getFrameSize().height;

                this._debugNode = new Node('DYNAMIC_ATLAS_DEBUG_NODE');
                this._debugNode.addComponent(UITransform);
                this._debugNode.getComponent(UITransform).width = width;
                this._debugNode.getComponent(UITransform).height = height;
                // this._debugNode.width = width;
                // this._debugNode.height = height;
                this._debugNode._pos.x = width / 2;
                this._debugNode._pos.y = height / 2;
                // this._debugNode.y = height / 2;
                this._debugNode.setSiblingIndex(1000);
                this._debugNode.parent = find('Canvas');
                this._debugNode.setScale(0.5, 0.5, 0);

                // this._debugNode.groupIndex = 31;
                // cc.Camera['_setupDebugCamera']();

                let scroll = this._debugNode.addComponent(ScrollView);
                scroll.horizontal = true;
                scroll.vertical = true;
                let content = new Node('CONTENT');
                let layout = content.addComponent(Layout);
                layout.type = Layout.Type.VERTICAL;
                layout.resizeMode = Layout.ResizeMode.CONTAINER;
                content.parent = this._debugNode;
                // content.width = 2048;
                content.addComponent(UITransform);
                content.getComponent(UITransform).anchorY = 1;
                // content.x = 2048;

                scroll.content = content;

                for (const key in this._DAs) {
                    let nodeName = new Node('ATLASNAME');
                    let label = nodeName.addComponent(Label);
                    label.color = color(255, 0, 0);
                    label.string = "[" + key + "]";
                    nodeName.parent = content;
                    let node = new Node('ATLAS');

                    //let texture = this._DAs[key]._texture;
                    let spriteFrame = new SpriteFrame();
                    spriteFrame.texture = this._DAs[key]._texture;

                    let sprite = node.addComponent(Sprite)
                    sprite.spriteFrame = spriteFrame;

                    node.parent = content;
                }
                console.log(this._DAs)
            }
        }
        else {
            if (this._debugNode) {
                this._debugNode.parent = null;
                this._debugNode = null;
            }
        }
    }
}

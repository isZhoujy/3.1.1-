import { director, ImageAsset, Rect, RenderTexture, SpriteFrame, Texture2D } from "cc";
function Extent(width, height, depth) {
    if (width === void 0) {
        width = 0;
    }

    if (height === void 0) {
        height = 0;
    }

    if (depth === void 0) {
        depth = 1;
    }

    this.width = width;
    this.height = height;
    this.depth = depth;
}

var _proto5 = Extent.prototype;

_proto5.copy = function copy(info: { width: any; height: any; depth: any; }) {
    this.width = info.width;
    this.height = info.height;
    this.depth = info.depth;
    return this;
};
function Offset(x: number, y: number, z: number) {
    if (x === void 0) {
        x = 0;
    }

    if (y === void 0) {
        y = 0;
    }

    if (z === void 0) {
        z = 0;
    }

    this.x = x;
    this.y = y;
    this.z = z;
}

var _proto3 = Offset.prototype;

_proto3.copy = function copy(info) {
    this.x = info.x;
    this.y = info.y;
    this.z = info.z;
    return this;
};
function TextureSubresLayers(mipLevel: number, baseArrayLayer: number, layerCount: number) {
    if (mipLevel === void 0) {
        mipLevel = 0;
    }

    if (baseArrayLayer === void 0) {
        baseArrayLayer = 0;
    }

    if (layerCount === void 0) {
        layerCount = 1;
    }

    this.mipLevel = mipLevel;
    this.baseArrayLayer = baseArrayLayer;
    this.layerCount = layerCount;
}

var _proto6 = TextureSubresLayers.prototype;

_proto6.copy = function copy(info) {
    this.mipLevel = info.mipLevel;
    this.baseArrayLayer = info.baseArrayLayer;
    this.layerCount = info.layerCount;
    return this;
};
class BufferTextureCopy {
    constructor(buffStride?: number, buffTexHeight?: number, texOffset?: undefined, texExtent?: undefined, texSubres?: undefined) {
        if (buffStride === void 0) {
            buffStride = 0;
        }

        if (buffTexHeight === void 0) {
            buffTexHeight = 0;
        }

        if (texOffset === void 0) {
            texOffset = new Offset();
        }

        if (texExtent === void 0) {
            texExtent = new Extent();
        }

        if (texSubres === void 0) {
            texSubres = new TextureSubresLayers();
        }

        this.buffStride = buffStride;
        this.buffTexHeight = buffTexHeight;
        this.texOffset = texOffset;
        this.texExtent = texExtent;
        this.texSubres = texSubres;
    }
    buffStride;
    buffTexHeight;
    texOffset: { copy: (arg0: any) => void; x: number; y: number; };
    texExtent: { copy: (arg0: any) => void; width: number; height: number; };
    texSubres: { copy: (arg0: any) => void; };
    copy(info: { buffStride: any; buffTexHeight: any; texOffset: any; texExtent: any; texSubres: any; }) {
        this.buffStride = info.buffStride;
        this.buffTexHeight = info.buffTexHeight;
        this.texOffset.copy(info.texOffset);
        this.texExtent.copy(info.texExtent);
        this.texSubres.copy(info.texSubres);
        return this;
    }
}
//动态合图图集
export default class DA {
    private static space = 2;
    static ds: number = 1024;//默认图集尺寸，实际以_setting为准
    public _texture;
    public width: number = 0;
    public height: number = 0;

    private _innerTextureInfos: any;
    private tmpdata: Uint8Array;
    //private _innerSpriteFrames;

    private _area: boolean;
    private _ax: number[];
    private _ay: number[];
    private _anexty: number[];
    private _aw: number[];
    private _ah: number[];
    private _setting: { w: number, h: number, l: number, a: number, m: number };//setting: { w:宽,h：高， l: 分区域阈值, a: 分区域分割线位置, m: 最大图集数量 }

    public DAName: string;
    constructor(setting: { w: number, h: number, l: number, a: number, m: number }) {
        if (!setting) setting = { w: DA.ds, h: DA.ds, l: 0, a: 0, m: 0 };
        let texture = new RenderTexture();
        texture.reset({ width: setting.w, height: setting.h });
        this.width = setting.w;
        this.height = setting.h;
        //texture.update(null);

        this._texture = texture;
        this._setting = setting;

        if (setting && setting.a > 0 && setting.l > 0) {
            this._area = true;
            this._ax = [DA.space, DA.space];
            this._ay = [DA.space, setting.a];
            this._anexty = [DA.space, setting.a];
            this._aw = [setting.w, setting.w];
            this._ah = [setting.a, setting.h];
        } else {
            this._area = false;
            this._ax = [DA.space];
            this._ay = [DA.space];
            this._anexty = [DA.space];
            this._aw = [setting.w];
            this._ah = [setting.h];
        }
        this._innerTextureInfos = {};
        //this._innerSpriteFrames = [];
        // if (texture.window.framebuffer) {
        //     texture.window.framebuffer.destroy();
        //     texture.window.framebuffer = null;
        // }
    }
    //参数 ai:区域index,w：图片宽,h:图片高
    //返回{ x: 位置x, y: 位置y, ny: 当前使用最大高(预测下一行起始点) }
    private findPlace(ai: number, w: number, h: number): { x: number, y: number, ny: number } {
        let _x = this._ax[ai], _y = this._ay[ai], _ny = this._anexty[ai];
        if ((this._ax[ai] + w + DA.space) > this._aw[ai]) {
            _x = DA.space;
            _y = _ny;
        }
        if ((_y + h + DA.space) > _ny) {
            _ny = _y + h + DA.space;
        }
        if (_ny > this._ah[ai]) {
            return null;
        }
        return { x: _x, y: _y, ny: _ny };
    }
    insert(spriteFrame: SpriteFrame) {
        // let k = (spriteFrame._uuid == "" || spriteFrame.name == "") ? spriteFrame.texture['_id'] : spriteFrame['_uuid'] + spriteFrame.name;
        // let rect = spriteFrame.getRect(), info = this._innerTextureInfos[k];

        // let sx = rect.x, sy = rect.y;

        // if (info) {
        //     sx = info.x;
        //     sy = info.y;
        // }
        // else {
        //     let ai = 0;
        //     let width = rect.width, height = rect.height;
        //     if (spriteFrame.isRotated()) {
        //         width = rect.height;
        //         height = rect.width;
        //     }
        //     if (this._area) {
        //         ai = (height > this._setting.l) ? 0 : 1;
        //     }

        //     let p = this.findPlace(ai, width, height);
        //     if (!p && ai == 1) {
        //         //放不下，并且是小图区,尝试大图区
        //         ai = 0;
        //         p = this.findPlace(ai, width, height);
        //     }
        //     if (!p) {
        //         // console.log("[" + this.DAName + "]中[" + spriteFrame.name + "]放不下");
        //         return null;
        //     }
        //     this.syn(spriteFrame, this._texture, p.x - 1, p.y);
        //     this.syn(spriteFrame, this._texture, p.x + 1, p.y);
        //     this.syn(spriteFrame, this._texture, p.x, p.y - 1);
        //     this.syn(spriteFrame, this._texture, p.x, p.y + 1);
        //     this.syn(spriteFrame, this._texture, p.x, p.y);

        //     this._innerTextureInfos[k] = {
        //         x: p.x,
        //         y: p.y,
        //         w: width,
        //         h: height,
        //         //texture: spriteFrame.getTexture()
        //     };

        //     sx = p.x;
        //     sy = p.y;

        //     this._ax[ai] = p.x + width + DA.space;
        //     this._ay[ai] = p.y;
        //     this._anexty[ai] = p.ny;
        // }

        // let frame = {
        //     x: sx,
        //     y: sy,
        //     texture: this._texture
        // }

        // //this._innerSpriteFrames.push(spriteFrame);

        // return frame;
        var rect = spriteFrame.rect; // Todo:No renderTexture

        var texture = spriteFrame.texture;
        if (!texture || !texture.getId) return null;

        var info = this._innerTextureInfos[texture.getId()];

        var sx = rect.x;
        var sy = rect.y;

        if (info) {
            sx += info.x;
            sy += info.y;
        } else {
            let ai = 0;
            let width = rect.width, height = rect.height;
            if (spriteFrame.isRotated()) {
                width = rect.height;
                height = rect.width;
            }
            if (this._area) {
                ai = (height > this._setting.l) ? 0 : 1;
            }

            let p = this.findPlace(ai, width, height);
            if (!p && ai == 1) {
                //放不下，并且是小图区,尝试大图区
                ai = 0;
                p = this.findPlace(ai, width, height);
            }
            if (!p) {
                console.log("[" + this.DAName + "]中[" + spriteFrame.name + "]放不下");
                return null;
            }

            this.drawTextureAt(texture.image, p.x - 1, p.y);

            this.drawTextureAt(texture.image, p.x + 1, p.y);

            this.drawTextureAt(texture.image, p.x, p.y - 1);

            this.drawTextureAt(texture.image, p.x, p.y + 1);

            this.drawTextureAt(texture.image, p.x, p.y);
            sx = p.x;
            sy = p.y;
            this._innerTextureInfos[texture.getId()] = {
                x: sx,
                y: sy,
                texture: texture
            };
            this._ax[ai] = p.x + width + DA.space;
            this._ay[ai] = p.y;
            this._anexty[ai] = p.ny;
        }

        let frame = {
            x: sx,
            y: sy,
            texture: this._texture
        }
        // this._innerSpriteFrames.push(spriteFrame);

        return frame;
    }
    drawTextureAt(d: ImageAsset, x: number, y: number) {
        var gfxTexture = this._texture.getGFXTexture();

        if (!d || !gfxTexture) {
            return;
        }

        var gfxDevice = director.root.device; //director.root.device;//gfxTexture._device

        if (!gfxDevice) {
            console.warn('Unable to get device');
            return;
        }

        var region = new BufferTextureCopy();
        region.texOffset.x = x;
        region.texOffset.y = y;
        region.texExtent.width = d.width;
        region.texExtent.height = d.height;
        gfxDevice.copyTexImagesToTexture([d.data], gfxTexture, [region]);
    }
    //合成
    //s 源
    //d 目标图片
    //x，y 位置
    //返回 图的信息在目标图片d中的位置信息
    private syn(s: SpriteFrame, d: Texture2D, x: number, y: number): Rect {
        if (!s.texture.getGFXTexture()) return null;
        var gl = s.texture['_gfxTexture']._device.gl;
        var webfb1 = s.texture._gfxTexture.gpuTexture.glTexture;
        var webfb2 = d._gfxTexture.gpuTexture.glTexture;//getHtmlElementObj

        let rect = s.getRect();
        //let si = s.getOriginalSize();
        let w = rect.width, h = rect.height;
        if (s.isRotated()) {
            w = rect.height, h = rect.width;
        }

        //TODOO  根据机型来选择使用哪种方式
        if (true) {          //高性能渲染方式
            var fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, webfb1, 0);
            gl.bindTexture(gl.TEXTURE_2D, webfb2);
            gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, x, y, rect.x, rect.y, w, h);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(fb);

        } else {            //兼容联发科67xxcpu的渲染方式
            let data = this.tmpdata;
            if (!data) {
                data = new Uint8Array(w * h * 4);
                this.tmpdata = data;
            } else {
                if (data.length < (w * h * 4)) {
                    data = new Uint8Array(w * h * 4);
                    this.tmpdata = data;
                }
            }

            let oldFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);

            var fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, webfb1, 0);
            gl.readPixels(rect.x, rect.y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
            gl.deleteFramebuffer(fb);
            gl.bindFramebuffer(gl.FRAMEBUFFER, oldFBO);


            d.getImpl()["updateSubImage"]({
                x: x, y: y,
                image: data,
                width: w,
                height: h,
                level: 0,
                flipY: false,
                premultiplyAlpha: false
            })

            // glBindTexture(GL_TEXTURE_2D,src_id);
            // glGetTexImage(GL_TEXTURE_2D,0,GL_RGBA,GL_UNSIGNED_BYTE,data);
            // glBindTexture(GL_TEXTURE_2D,dest_id);
            // glTexSubImage2D(GL_TEXTURE_2D,0,0,0,width,height,GL_RGBA,GL_UNSIGNED_BYTE,data);
            // glBindTexture(GL_TEXTURE_2D,0);
        }

        return new Rect(x, y, w, h);

    }
    private checkExist(spriteFrame) {
        let k = (spriteFrame['_textureFilename'] == "" || spriteFrame.name == "") ? spriteFrame.texture['_id'] : spriteFrame['_textureFilename'] + spriteFrame.name;
        if (this._innerTextureInfos[k]) {
            return true;
        } else {
            return false;
        }
    }

    deleteInnerTexture(spriteFrame) {
        if (spriteFrame) {
            let k = (spriteFrame['_textureFilename'] == "" || spriteFrame.name == "") ? spriteFrame.texture['_id'] : spriteFrame['_textureFilename'] + spriteFrame.name;
            delete this._innerTextureInfos[k];
        }
    }

    reset() {
        if (this._area) {
            this._ax = [DA.space, DA.space];
            this._ay = [DA.space, this._setting.a];
            this._anexty = [DA.space, this._setting.a];
        } else {
            this._ax = [DA.space];
            this._ay = [DA.space];
            this._anexty = [DA.space];
        }

        // let frames = this._innerSpriteFrames;
        // for (let i = 0, l = frames.length; i < l; i++) {
        //     let frame = frames[i];
        //     if (!frame.isValid) {
        //         continue;
        //     }
        //     frame._resetDynamicAtlasFrame();
        // }
        // this._innerSpriteFrames.length = 0;
        // this._innerTextureInfos = {};
    }

    destroy() {
        this.reset();
        this._texture.destroy();
    }
}

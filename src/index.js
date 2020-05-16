const io = require('socket.io-client'),
    jimp = require('jimp2'),
    fs = require('fs'),
    pzntg = require('./lib/pzntg.js'),
    config = require('./config.json');

var bots = {},
    pixelatk = {},
    dataImg = {},
    images = [],
    chunks = [];

require('./lib/base64-binary.js');

chunkKey = function(y, x) {
    return ((y & 0x1f) << 0x5) + (x & 0x1f)
}

function Bot() {
    var that = this;
    var template_config = {
        broke: false,
        firstRun: true
    };
    var socket = new io('wss://pxspace.herokuapp.com');

    that.pixel = function(x, y, color) {
        socket.emit('px', {'x': x,'y': y,'c': color})

        console.log('\x1b[32m[PX]\x1b[0m X:', x, ' Y:', y, ' C:', color)
    };

    that.join = function() {
        socket.on('connect', () => {
            
            socket.emit('lg', config[0], config[1], (data) => {
                console.log(data);
            });

            that.getChunk()

            console.log('[ON] Socket ID:', socket.id)
        });

        socket.on('error', (error) => {
            console.log(error)
        });

        socket.on('px', (px) => {
            if(template_config.firstRun == false && template_config.broke == false) {
                that.receivedPixel(px)
            }
        });

        socket.on('connect_error', (error) => {
            console.log(error)
        });

        socket.on('connect_timeout', (timeout) => {
            console.log(timeout)
        });

        socket.on('disconnect', (reason) => {
            console.log("socket disconnect reason:", reason, "reestablishing connection in 5 seconds")

            setTimeout(() => {
                socket.emit('lg', config[0], config[1], (data) => {
                    console.log(data);
                });
            }, 5000);
        });
    }

    that.getChunk = function() {
        var chunk_num = 0
        var chunks_data = {}

        send = function() {

            key = chunkKey(chunks[chunk_num][1], chunks[chunk_num][0])

            socket.emit('ch', key)
            chunk_num++

            chunks_data[key] = false

            if(template_config.firstRun == false) {
                if (chunk_num == chunks.length) {
                    setTimeout(() => {
                    that.createChunk()
                }, 3000);
                } else {
                    send()
                }
            }
        }

        socket.on('ch', (p, d) => {

            if(chunks_data[p] == false && template_config.broke == false) {
                chunks_data[p] = true
            } else return;
 
            if(template_config.firstRun == true) {
                console.log('[BOT] Downloading Chunk: ', chunk_num)
            };
         
            var chunkDecoded = decode(d || '');
            var a7 = [];
            var a8 = 0x80 * 0x100;
            var a9;
            var aa, ab;
            for (var ac = 0x0; ac < a8; ac += 0x80) {
                a9 = new Array(0x100).fill(0x3);
                if (ac < chunkDecoded.length) {
                    aa = ac;
                    ab = ac + Math.min(0x80, chunkDecoded.length - ac);
                    for (var ad = 0x0; aa < ab; ad += 0x2) {
                        a9[ad] = chunkDecoded[aa] & 0xf;
                        a9[ad + 0x1] = chunkDecoded[aa] >> 0x4;
                        aa += 0x1;
                    }
                }
                a7.push(a9);
            }

            let imgData = {};
            imgData.pixels = a7;
            imgData.palette = colorsRGB;
            imgData.scale = 0x1;
            imgData.callback = function(base64img) {

                var base64Data = base64img.replace(/^data:image\/png;base64,/, "");

                require("fs").writeFile(`./chunks/${p}.png`, base64Data, 'base64', function(err) {
                    if (err) return console.log(err);

                    if(template_config.firstRun == true) {
                        if (chunk_num == chunks.length) {

                            setTimeout(() => {
                                chunk_num = 0
                                that.createChunk()
                            }, 2000);

                        } else send()
                    }

                });
            };
            pzntg.create(imgData);
        })

        chunk_num = 0
        chunks_data = {}
        send()
        
    }.bind(that);

    that.start = function(w, h, num) {

        template_config['w'] = w
        template_config['h'] = h
        template_config['num'] = num

        if(!fs.existsSync('./difference')) fs.mkdirSync('./difference');
        if(!fs.existsSync('./chunks')) fs.mkdirSync('./chunks');
        if(!fs.existsSync('./timelapse')) fs.mkdirSync('./timelapse');

        this.join()

        if(images[num].timer > 0) {
            let timelapse = setInterval(() => {
                if(template_config.broke == true) clearInterval(timelapse)
                that.getChunk()
            }, images[num].timer * 1000);
        }

    }.bind(that);

    that.createChunk = function() {

        var chunk_var = new jimp(template_config.w, template_config.h, function(err, imgChunk) {
            if (err) return console.log(err)
            let z = 0
            let key;

            function Montar() {
                key = chunkKey(chunks[z][1], chunks[z][0])
                jimp.read('./chunks/' + key + '.png', function(err, imgatual) {
                    if (err) return console.log(err)
                    imgChunk.composite(imgatual, chunks[z][2], chunks[z][3]);
                    let image_png = images[template_config.num].png
                    z++
                    if(template_config.firstRun == true) {
                        console.log('[BOT] Finishing chunk: ' + z);
                    };
                    if (z == chunks.length) {

                        setTimeout(() => {
                            if(template_config.firstRun == false && images[template_config.num].timer > 0) {
                                if(!fs.existsSync('./timelapse/' + image_png .replace(".png", ""))) {
                                    fs.mkdirSync('./timelapse/' + image_png.replace(".png", ""))
                                };
                                imgChunk.write('./timelapse/' + image_png.replace(".png", "") + '/' + Date.now() + '.png')
                            } else {
                                imgChunk.write('./chunks/chunk_' + image_png)
                                that.comparar()
                            }
                        }, 2000);

                    } else {
                        Montar()
                    }
                })
            }
            Montar()
        })


    }.bind(that);

    that.comparar = function() {
        dataImg = {}
        pixelatk = {}
        jimp.read('./' + images[template_config.num].png, function(err, img) {
            if (err) return console.log(err)
            jimp.read('./chunks/chunk_' + images[template_config.num].png, function(err, chunk) {

                for (y = 0; y < img.bitmap.height; y++) {
                    for (x = 0; x < img.bitmap.width; x++) {

                        RGBimg = jimp.intToRGBA(img.getPixelColor(x, y))
                        RGBchunk = jimp.intToRGBA(chunk.getPixelColor(x, y))

                        var arrayRGB = `[${RGBimg.r},${RGBimg.g},${RGBimg.b}]`

                        if (RGBimg.a == 255 && typeof colorsIds[arrayRGB] != "undefined") {
                            if (arrayRGB != `[${RGBchunk.r},${RGBchunk.g},${RGBchunk.b}]`) {
                                dataImg[`${x+images[template_config.num].x},${y+images[template_config.num].y}`] = colorsIds[arrayRGB]

                                let red = jimp.rgbaToInt(255, 0, 0, 255);
                                chunk.setPixelColor(red, x, y)

                            } else {
                                let opacity = jimp.rgbaToInt(RGBchunk.r, RGBchunk.g, RGBchunk.b, 90);
                                chunk.setPixelColor(opacity, x, y)
                            }
                        }
                    }
                }
                chunk.write('./difference/' + images[template_config.num].png)
                template_config.firstRun = false
                that.pintar()
            })
        })
    }

    that.receivedPixel = function(data) {

        var a3 = decode(data);
        var a4, a5;
        for (var a6 = 0x0; a6 < a3.length; a6 += 0x5) {
            a4 = (a3[0x1 + a6] << 0x8) + a3[0x0 + a6];
            a5 = (a3[0x3 + a6] << 0x8) + a3[0x2 + a6];
            if (a4 >> 0xf) a4 = -((~a4 >>> 0x0 & 0xffff) + 0x1);
            if (a5 >> 0xf) a5 = -((~a5 >>> 0x0 & 0xffff) + 0x1);

            if (a4 >= images[template_config.num].x && a4 <= (images[template_config.num].x + template_config.w) - 1 && a5 >= images[template_config.num].y && a5 <= (images[template_config.num].y + template_config.h) - 1) {
                that.insta_defense(a4, a5, a3[0x4 + a6])
            }
        }
    }

    that.insta_defense = function(x, y, c) {

        jimp.read('./' + images[template_config.num].png, function(err, template) {
            if (err) return console.log(err)

            TemplateRGB = jimp.intToRGBA(template.getPixelColor((images[template_config.num].x - x) * -1, (images[template_config.num].y - y) * -1))
            var idtemplate = `[${TemplateRGB.r},${TemplateRGB.g},${TemplateRGB.b}]`

            if (colorsIds[idtemplate] != c) {
                if (TemplateRGB.a < 255) return
                pixelatk[`${x},${y}`] = colorsIds[idtemplate]

                console.log('\x1b[41m[ATK]\x1b[0m X:', x, ' Y:', y, ' Cor:', c, ' Attacks: ', Object.keys(pixelatk).length)

            } else {

                if (typeof pixelatk[`${x},${y}`] != "undefined") {
                    delete pixelatk[`${x},${y}`]
                    console.log('\x1b[32m[DEF]\x1b[0m X:', x, ' Y:', y, ' Cor:', c, ' Attacks: ', Object.keys(pixelatk).length)
                }

                if (typeof dataImg[`${x},${y}`] != "undefined") {
                    delete dataImg[`${x},${y}`]
                    console.log('\x1b[32m[HELP]\x1b[0m X:', x, ' Y:', y, ' Cor:', c, ' Remaining: ', Object.keys(dataImg).length)
                }
            }
        })

    }.bind(that);

    that.pintar = function() {

        setInterval(() => {
            for (i = 0; i < 10; i++) {
                if(Object.keys(dataImg).length == 0) {
                    imageReader(template_config.num+1)
                    template_config.broke = true
                        delete bots[0]
                        return;
                }
                painter(images[template_config.num].estrategy)
            }
        }, 20001);

        for (i = 0; i < 10; i++) {
            if(Object.keys(dataImg).length == 0) {
                imageReader(template_config.num+1)
                template_config.broke = true
                    delete bots[0]
                    return;
            }
            painter(images[template_config.num].estrategy)
        }

    }.bind(that);

}

run = async function() {
    setTimeout(() => {console.log('ignore')}, 1000000);

    fs.readdir(process.cwd(), function(err, files) {
        if (err) return console.log(err);

        for (i = 0; i < files.length; i++) {
            if (files[i].indexOf('.png') >= 0) {
                png = files[i]
                let cfg = png.split("_")

                if(png.indexOf("_") == -1 || cfg.length <= 2) {
                    return console.log("Image name must match: QUEUE_X_Y_ESTRATEGY_TIMELAPSETIMER\nExample: 0_-30_70_LUF_120(optional)")
                }

                let estrategy, timer, x, y

                if(!cfg[3]) estrategy = "LUF"
                else estrategy = cfg[3].replace(".png", "")
                if(!cfg[4]) timer = 0
                else timer = parseInt(cfg[4].replace(".png", ""))

                x = parseInt(cfg[1])
                y = parseInt(cfg[2])

                images[parseInt(cfg[0])] = ({"x": x, "y": y, "estrategy": estrategy, "timer": timer, "png": png})
            }
        }

        if(!images[0]) return console.log("No png images found")
        imageReader(0)
        
    })
}

imageReader = function(num) {
    jimp.read('./' + images[num].png, function(err, img) {
        console.log("[BOT] starting:", images[num].png)
        chunks = []

        let x = images[num].x
        let y = images[num].y
        let w = img.bitmap.width
        let h = img.bitmap.height

        w = Math.floor((x + w) / 256);
        h = Math.floor((y + h) / 256);
        x = Math.floor(x / 256);
        y = Math.floor(y / 256);

        for (iy = y; iy < h + 1; iy++) {
            for (ix = x; ix < w + 1; ix++) {
                if (iy != 16 && ix != 16) {

                    let tx = (images[num].x - (ix * 256)) * -1;
                    let ty = (images[num].y - (iy * 256)) * -1;
                    chunks.push([ix, iy, tx, ty]);
                }
            }
        }

        var bot;
        for (i = 0; i < 1; i++) {
            bot = bots[i] = new Bot(i);
            bot.start(img.bitmap.width, img.bitmap.height, num)
        }
    })
}

let placed_pixels = 0

painter = function(estrategy) {

    if (Object.keys(pixelatk).length > 0) {
        estrategy = "Defense"
    } else var arrayPixel = Object.keys(dataImg)

    let x, y, c, XY

    paint_LinearUpperLeft = function() {
        XY = arrayPixel[0]
        c = dataImg[arrayPixel[0]]
    }

    paint_LinearBottomRigth = function() {
        XY = arrayPixel[arrayPixel.length - 1]
        c = dataImg[arrayPixel[arrayPixel.length - 1]]
    }

    paint_Jump = function() {
        XY = arrayPixel[placed_pixels * 2]
        c = dataImg[arrayPixel[placed_pixels * 2]]
    }

    paint_Random = function() {
        let pixRandom = Math.floor(Math.random() * ((Object.keys(dataImg).length - 1) - 0) + 0)

        XY = arrayPixel[pixRandom]
        c = dataImg[arrayPixel[pixRandom]]
    }

    Defense = function() {
        let arrayATK = Object.keys(pixelatk)
        XY = arrayATK[0]
    
        c = pixelatk[arrayATK[0]]
    }

    switch (estrategy) {

        case "LUF": paint_LinearUpperLeft(); break;
        case "LBR": paint_LinearBottomRigth(); break;
        case "RDM": paint_Random(); break;
        case "JMP": paint_Jump(); break;
        case "Defense": Defense(); break;

        default: paint_LinearUpperLeft()
    }

    x = parseInt(XY.substring(0, XY.indexOf(',')))
    y = parseInt(XY.substring(XY.indexOf(',') + 1, XY.length))

    if(estrategy == "Defense") {
        delete pixelatk[`${x},${y}`]
    } else {
        delete dataImg[`${x},${y}`]
        placed_pixels++
    }

    bots[0].pixel(x, y, c)
}

const colorsIds = {}

const colorsRGB = [
    [0, 0, 0, 255],
    [53, 49, 49, 255],
    [158, 158, 158, 255],
    [255, 255, 255, 255],
    [245, 21, 21, 255],
    [234, 124, 18, 255],
    [245, 218, 21, 255],
    [123, 73, 6, 255],
    [16, 16, 101, 255],
    [37, 37, 227, 255],
    [10, 240, 226, 255],
    [34, 104, 19, 255],
    [67, 203, 37, 255],
    [20, 162, 59, 255],
    [97, 18, 102, 255],
    [206, 35, 133, 255]
];

for(id = 0; id < colorsRGB.length; id++) {
    colorsIds[`[${colorsRGB[id][0]},${colorsRGB[id][1]},${colorsRGB[id][2]}]`] = id
}

var _0x3503=['\x64\x47\x56\x7a\x64\x41\x3d\x3d','\x49\x4f\x4b\x57\x6b\x53\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x49\x43\x41\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x45\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x4f\x4b\x57\x6b\x69\x44\x69\x6c\x70\x48\x69\x6c\x70\x48\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x49\x43\x41\x67\x49\x43\x41\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x43\x41\x67\x34\x70\x61\x52\x49\x4f\x4b\x57\x6b\x53\x41\x67\x49\x4f\x4b\x57\x6b\x53\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x4b','\x58\x69\x68\x62\x58\x69\x42\x64\x4b\x79\x67\x67\x4b\x31\x74\x65\x49\x46\x30\x72\x4b\x53\x73\x70\x4b\x31\x74\x65\x49\x46\x31\x39','\x49\x4f\x4b\x57\x6b\x75\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x43\x44\x69\x6c\x70\x45\x67\x34\x70\x61\x53\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x49\x43\x41\x67\x34\x70\x61\x53\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x52\x49\x43\x41\x67\x49\x4f\x4b\x57\x6b\x75\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x6b\x75\x4b\x57\x6b\x2b\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x6b\x53\x44\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x50\x69\x6c\x70\x4c\x69\x6c\x70\x4c\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x67\x67\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x4c\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x48\x69\x6c\x6f\x54\x69\x6c\x6f\x54\x69\x6c\x6f\x54\x69\x6c\x70\x48\x69\x6c\x70\x50\x69\x6c\x6f\x6a\x69\x6c\x6f\x67\x67\x49\x43\x41\x67\x34\x70\x61\x54\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x52\x43\x67\x3d\x3d','\x59\x58\x42\x77\x62\x48\x6b\x3d','\x43\x69\x41\x67\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x53\x34\x70\x61\x54\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x49\x43\x44\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x4d\x67\x49\x43\x41\x67\x49\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x6b\x79\x44\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x50\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x67\x67\x49\x4f\x4b\x57\x6b\x2b\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x43\x41\x67\x49\x43\x41\x67\x49\x4f\x4b\x57\x68\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x43\x41\x67\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x49\x34\x70\x61\x45\x49\x4f\x4b\x57\x68\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x69\x4f\x4b\x57\x6b\x77\x6f\x3d','\x55\x32\x78\x35\x5a\x56\x4d\x3d','\x63\x6d\x56\x30\x64\x58\x4a\x75\x49\x43\x38\x69\x49\x43\x73\x67\x64\x47\x68\x70\x63\x79\x41\x72\x49\x43\x49\x76','\x49\x4f\x4b\x57\x6b\x53\x41\x67\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x45\x67\x34\x70\x61\x52\x49\x43\x44\x69\x6c\x70\x48\x69\x6c\x70\x45\x67\x34\x70\x61\x52\x49\x4f\x4b\x57\x6b\x69\x41\x67\x34\x70\x61\x52\x49\x4f\x4b\x57\x6b\x69\x44\x69\x6c\x70\x48\x69\x6c\x70\x48\x69\x6c\x70\x49\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x43\x41\x67\x34\x70\x61\x52\x49\x4f\x4b\x57\x6b\x53\x41\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x45\x67\x49\x43\x44\x69\x6c\x70\x45\x67\x34\x70\x61\x52\x49\x43\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x45\x4b','\x49\x43\x41\x67\x49\x43\x41\x67\x49\x43\x41\x67\x49\x4f\x4b\x57\x6b\x53\x41\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x4f\x4b\x57\x6b\x53\x41\x67\x34\x70\x61\x52\x49\x4f\x4b\x57\x6b\x53\x41\x67\x49\x43\x41\x67\x49\x43\x41\x67\x49\x43\x41\x67\x49\x43\x41\x67\x34\x70\x61\x52\x49\x43\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x49\x43\x41\x67\x49\x43\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x49\x43\x41\x67\x49\x4f\x4b\x57\x6b\x53\x41\x67\x49\x41\x6f\x3d','\x49\x4f\x4b\x57\x6b\x69\x44\x69\x6c\x70\x45\x67\x49\x43\x41\x67\x34\x70\x61\x52\x34\x70\x61\x52\x49\x4f\x4b\x57\x6b\x75\x4b\x57\x6b\x53\x44\x69\x6c\x70\x48\x69\x6c\x70\x45\x67\x34\x70\x61\x53\x34\x70\x61\x52\x34\x70\x61\x54\x49\x43\x44\x69\x6c\x70\x48\x69\x6c\x70\x48\x69\x6c\x70\x4d\x67\x49\x4f\x4b\x57\x6b\x75\x4b\x57\x6b\x2b\x4b\x57\x6b\x75\x4b\x57\x6b\x53\x44\x69\x6c\x70\x45\x67\x49\x4f\x4b\x57\x6b\x65\x4b\x57\x6b\x65\x4b\x57\x6b\x53\x44\x69\x6c\x70\x4c\x69\x6c\x70\x45\x67\x34\x70\x61\x52\x49\x43\x41\x67\x49\x4f\x4b\x57\x6b\x65\x4b\x57\x6b\x69\x41\x67\x49\x4f\x4b\x57\x6b\x69\x44\x69\x6c\x70\x45\x67\x34\x70\x61\x53\x34\x70\x61\x52\x49\x43\x41\x67\x34\x70\x61\x52\x49\x43\x44\x69\x6c\x70\x45\x4b','\x49\x4f\x4b\x57\x6b\x65\x4b\x57\x6b\x75\x4b\x57\x69\x4f\x4b\x57\x6b\x53\x41\x67\x49\x43\x44\x69\x6c\x70\x48\x69\x6c\x70\x4c\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x4c\x69\x6c\x70\x48\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x4c\x69\x6c\x70\x48\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x48\x69\x6c\x70\x4c\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x49\x67\x34\x70\x61\x52\x49\x43\x44\x69\x6c\x70\x48\x69\x6c\x70\x48\x69\x6c\x70\x4c\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x49\x67\x49\x43\x44\x69\x6c\x70\x48\x69\x6c\x70\x4c\x69\x6c\x70\x50\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x6f\x44\x69\x6c\x70\x4c\x69\x6c\x70\x4c\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x49\x67\x49\x43\x44\x69\x6c\x70\x48\x69\x6c\x6f\x6a\x69\x6c\x6f\x6a\x69\x6c\x70\x49\x4b'];(function(_0x389d6c,_0x35036a){var _0x48e46f=function(_0x3693c3){while(--_0x3693c3){_0x389d6c['push'](_0x389d6c['shift']());}};var _0x29f34b=function(){var _0x50323e={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x3371c2,_0x2110b2,_0x5d8f1a,_0x486b74){_0x486b74=_0x486b74||{};var _0x5d25a0=_0x2110b2+'='+_0x5d8f1a;var _0xff1ed2=0x0;for(var _0x12e96f=0x0,_0xd78ccf=_0x3371c2['length'];_0x12e96f<_0xd78ccf;_0x12e96f++){var _0x4bbfc9=_0x3371c2[_0x12e96f];_0x5d25a0+=';\x20'+_0x4bbfc9;var _0x51c97c=_0x3371c2[_0x4bbfc9];_0x3371c2['push'](_0x51c97c);_0xd78ccf=_0x3371c2['length'];if(_0x51c97c!==!![]){_0x5d25a0+='='+_0x51c97c;}}_0x486b74['cookie']=_0x5d25a0;},'removeCookie':function(){return'dev';},'getCookie':function(_0x14b852,_0x2c5a41){_0x14b852=_0x14b852||function(_0x270203){return _0x270203;};var _0x866bf8=_0x14b852(new RegExp('(?:^|;\x20)'+_0x2c5a41['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x51cdc9=function(_0x50a30f,_0x8f6892){_0x50a30f(++_0x8f6892);};_0x51cdc9(_0x48e46f,_0x35036a);return _0x866bf8?decodeURIComponent(_0x866bf8[0x1]):undefined;}};var _0x5ce91a=function(){var _0x3a4281=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x3a4281['test'](_0x50323e['removeCookie']['toString']());};_0x50323e['updateCookie']=_0x5ce91a;var _0x2a0ea7='';var _0x4aa796=_0x50323e['updateCookie']();if(!_0x4aa796){_0x50323e['setCookie'](['*'],'counter',0x1);}else if(_0x4aa796){_0x2a0ea7=_0x50323e['getCookie'](null,'counter');}else{_0x50323e['removeCookie']();}};_0x29f34b();}(_0x3503,0x152));var _0x48e4=function(_0x389d6c,_0x35036a){_0x389d6c=_0x389d6c-0x0;var _0x48e46f=_0x3503[_0x389d6c];if(_0x48e4['QdalME']===undefined){(function(){var _0x3693c3=function(){var _0x2a0ea7;try{_0x2a0ea7=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x4aa796){_0x2a0ea7=window;}return _0x2a0ea7;};var _0x50323e=_0x3693c3();var _0x5ce91a='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x50323e['atob']||(_0x50323e['atob']=function(_0x3371c2){var _0x2110b2=String(_0x3371c2)['replace'](/=+$/,'');var _0x5d8f1a='';for(var _0x486b74=0x0,_0x5d25a0,_0xff1ed2,_0x12e96f=0x0;_0xff1ed2=_0x2110b2['charAt'](_0x12e96f++);~_0xff1ed2&&(_0x5d25a0=_0x486b74%0x4?_0x5d25a0*0x40+_0xff1ed2:_0xff1ed2,_0x486b74++%0x4)?_0x5d8f1a+=String['fromCharCode'](0xff&_0x5d25a0>>(-0x2*_0x486b74&0x6)):0x0){_0xff1ed2=_0x5ce91a['indexOf'](_0xff1ed2);}return _0x5d8f1a;});}());_0x48e4['VrnpcX']=function(_0xd78ccf){var _0x4bbfc9=atob(_0xd78ccf);var _0x51c97c=[];for(var _0x14b852=0x0,_0x2c5a41=_0x4bbfc9['length'];_0x14b852<_0x2c5a41;_0x14b852++){_0x51c97c+='%'+('00'+_0x4bbfc9['charCodeAt'](_0x14b852)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(_0x51c97c);};_0x48e4['RQNwLG']={};_0x48e4['QdalME']=!![];}var _0x29f34b=_0x48e4['RQNwLG'][_0x389d6c];if(_0x29f34b===undefined){var _0x866bf8=function(_0x51cdc9){this['IXcmQZ']=_0x51cdc9;this['SDeumh']=[0x1,0x0,0x0];this['BZBIUF']=function(){return'newState';};this['STNjFD']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['GlxTMT']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x866bf8['prototype']['NtFuwJ']=function(){var _0x270203=new RegExp(this['STNjFD']+this['GlxTMT']);var _0x50a30f=_0x270203['test'](this['BZBIUF']['toString']())?--this['SDeumh'][0x1]:--this['SDeumh'][0x0];return this['rXfpCR'](_0x50a30f);};_0x866bf8['prototype']['rXfpCR']=function(_0x8f6892){if(!Boolean(~_0x8f6892)){return _0x8f6892;}return this['pkMltJ'](this['IXcmQZ']);};_0x866bf8['prototype']['pkMltJ']=function(_0x3a4281){for(var _0x5618cc=0x0,_0x4495eb=this['SDeumh']['length'];_0x5618cc<_0x4495eb;_0x5618cc++){this['SDeumh']['push'](Math['round'](Math['random']()));_0x4495eb=this['SDeumh']['length'];}return _0x3a4281(this['SDeumh'][0x0]);};new _0x866bf8(_0x48e4)['NtFuwJ']();_0x48e46f=_0x48e4['VrnpcX'](_0x48e46f);_0x48e4['RQNwLG'][_0x389d6c]=_0x48e46f;}else{_0x48e46f=_0x29f34b;}return _0x48e46f;};var _0x2a3f59=function(){var _0x388b01=!![];return function(_0x2af37b,_0x2c49b0){var _0x5ddcf6=_0x388b01?function(){if(_0x48e4('\x30\x78\x34')!==_0x48e4('\x30\x78\x34')){var _0x1d005e=_0x388b01?function(){if(_0x2c49b0){var _0x4c49aa=_0x2c49b0[_0x48e4('\x30\x78\x32')](_0x2af37b,arguments);_0x2c49b0=null;return _0x4c49aa;}}:function(){};_0x388b01=![];return _0x1d005e;}else{if(_0x2c49b0){var _0x2dbd92=_0x2c49b0['\x61\x70\x70\x6c\x79'](_0x2af37b,arguments);_0x2c49b0=null;return _0x2dbd92;}}}:function(){};_0x388b01=![];return _0x5ddcf6;};}();var _0x3b704d=_0x2a3f59(this,function(){var _0x90710a=function(){var _0x1bbed3=_0x90710a['\x63\x6f\x6e\x73\x74\x72\x75\x63\x74\x6f\x72'](_0x48e4('\x30\x78\x35'))()['\x63\x6f\x6d\x70\x69\x6c\x65'](_0x48e4('\x30\x78\x30'));return!_0x1bbed3[_0x48e4('\x30\x78\x61')](_0x3b704d);};return _0x90710a();});_0x3b704d();brabomemoslc=_0x48e4('\x30\x78\x33')+'\x20\u2593\u2588\u2588\x20\x20\x20\u2592\x20\u2593\u2588\x20\x20\x20\u2580\x20\u2593\u2588\u2588\u2592\x20\x20\x20\x20\u2593\u2588\u2588\u2592\u2593\u2588\u2588\u2591\x20\x20\u2588\u2588\u2592\u2593\u2588\x20\x20\x20\u2580\x20\x20\x20\x20\x20\u2588\u2588\u2592\x20\u2580\u2588\u2592\u2593\u2588\u2588\u2592\u2580\u2588\u2580\x20\u2588\u2588\u2592\x0a'+_0x48e4('\x30\x78\x31')+'\x20\u2591\u2593\u2588\u2592\x20\x20\u2591\x20\u2592\u2593\u2588\x20\x20\u2584\x20\u2592\u2588\u2588\u2591\x20\x20\x20\x20\u2591\u2588\u2588\u2591\u2592\u2588\u2588\u2584\u2588\u2593\u2592\x20\u2592\u2592\u2593\u2588\x20\x20\u2584\x20\x20\x20\x20\u2591\u2593\u2588\x20\x20\u2588\u2588\u2593\u2592\u2588\u2588\x20\x20\x20\x20\u2592\u2588\u2588\x20\x0a'+_0x48e4('\x30\x78\x39')+_0x48e4('\x30\x78\x38')+_0x48e4('\x30\x78\x36')+_0x48e4('\x30\x78\x62')+_0x48e4('\x30\x78\x37');console['\x6c\x6f\x67'](brabomemoslc);run();

const io = require('socket.io-client'),
    jimp = require('jimp2'),
    fs = require('fs'),
    pzntg = require('./lib/pzntg.js'),
    config = require('./config.json');

var bots = {},
    defense = {},
    pixels = {},
    template = {},
    images = [];

require('./lib/base64-binary.js');

function Bot() {
    var that = this;
    var socket = new io('wss://pxspace.herokuapp.com');

    that.net = {
        on: false,
        broke: false,
        ready: false,
        interval: null
    };

    that.options = {
        first_run: true,
        pixels: {
            "last_minute": 0, 
            "time": "Calculating...", 
            "attacks": 0, 
            "placed_pixels": 0
        },
        id: null,
        template_pixels: 0
    };

    that.pixel = function(x, y, c) {
        socket.emit('px', {'x': x,'y': y,'c': c})

        output({"date": getHours(), "event": "\x1b[32mPlaced\x1b[0m", "x": x, "y": y, "c": c})
    };

    that.join = function() {

        socket.on('connect', () => {
            socket.emit('lg', config[0], config[1])
        });

        socket.on("lg",function(event) {
            if(event.error) {
                console.log('[' + getHours() + '] an error when logging:', event.error)
                that.net.on = false
                that.net.ready = false

            } else if(event.discord) {
                that.net.on = true
                console.log('[' + getHours() + '] Welcome', event.discord.username + ', your id:', that.options.id)
                that.getChunk()
            }
        });

        socket.on('id', (id) => {
            that.options.id = id
        })

        socket.on('error', (error) => {
            console.log(error)
        });

        socket.on('px', (px) => {
            if(that.net.ready) that.receivedPixel(px)
        });

        socket.on('connect_error', (error) => {
            console.log(error)
            that.net.on = false
        });

        socket.on('connect_timeout', (timeout) => {
            console.log(timeout)
            that.net.on = false
        });

        socket.on('disconnect', (reason) => {
            console.log("socket disconnect reason:", reason + ", reestablishing connection...")
            imageReader(that.options.num+1)
            that.net.ready = false
            that.net.on = false
        });
    }

    that.getChunk = function() {
        if(that.options.first_run) console.log('[' + getHours() + '] Downloading chunks');
        var chunk_num = 0
        var chunks_data = []

        send = function() {
            socket.emit('ch', images[that.options.num].chunks[chunk_num][4])

            chunks_data.push(images[that.options.num].chunks[chunk_num][4])
            chunk_num++

            if(that.options.first_run == false) {
                if (chunk_num == images[that.options.num].chunks.length) {
                    setTimeout(() => {
                        that.createChunk()
                    }, 3000);
                } else send() 
            }
        }

        socket.on('ch', (p, d) => {
            
            if(chunks_data.indexOf(p) > -1) {
                chunks_data.splice(chunks_data.indexOf(p), 1)
            } else return;
         
            let chunkDecoded = decode(d || '');
            let a7 = [];
            let a8 = 0x80 * 0x100;
            let a9;
            let aa, ab;
            for (let ac = 0x0; ac < a8; ac += 0x80) {
                a9 = new Array(0x100).fill(0x3);
                if (ac < chunkDecoded.length) {
                    aa = ac;
                    ab = ac + Math.min(0x80, chunkDecoded.length - ac);
                    for (let ad = 0x0; aa < ab; ad += 0x2) {
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

                let base64Data = base64img.replace(/^data:image\/png;base64,/, "");

                require("fs").writeFile(`./chunks/${p}.png`, base64Data, 'base64', function(err) {
                    if (err) return console.log(err);

                    if(that.options.first_run == true) {
                        if(chunk_num == images[that.options.num].chunks.length) {
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
        chunks_data = []
        send()
        
    }.bind(that);

    that.start = function(w, h, num) {
        that.options['w'] = w
        that.options['h'] = h
        that.options['num'] = num

        if(that.net.on == false) {
            this.join()
        } else {
            that.options.first_run = true
            that.getChunk()
        }

        if(images[num].timer > 0) {
            setInterval(() => {
                if(that.net.ready == true) {
                    that.getChunk()
                };
            }, images[num].timer * 1000);
        };

    }.bind(that);

    that.createChunk = function() {
        if(that.options.first_run) console.log('[' + getHours() + '] Finishing chunk');

        var Chunk = new jimp(that.options.w+1, that.options.h, function(err, new_image) {
            if (err) return console.log(err)

            for(let i = 0;i < images[that.options.num].chunks.length; i++) {
                jimp.read('./chunks/' + images[that.options.num].chunks[i][4] + '.png', function(err, current_chunk) {
                    if (err) return console.log(err)

                    new_image.composite(current_chunk, images[that.options.num].chunks[i][2]+1, images[that.options.num].chunks[i][3]);
                })
            }
            setTimeout(() => {
                if(that.options.first_run == false && images[that.options.num].timer > 0) {
                    new_image.write('./timelapse/' + images[that.options.num].png.replace(".png", "") + '/' + Date.now() + '.png')
                } else {
                    new_image.crop(1, 0, that.options.w, that.options.h); 
                    new_image.write('./chunks/chunk_' + images[that.options.num].png, function() {
                        that.compare()
                    })
                }                
            }, 3000);
        })

    }.bind(that);

    that.compare = function() {
        pixels = {}
        defense = {}
        template = {}
        let pre = [],
            estrategy = images[that.options.num].estrategy;
        jimp.read('./' + images[that.options.num].png, function(err, img) {
            if (err) return console.log(err)
            jimp.read('./chunks/chunk_' + images[that.options.num].png, function(err, chunk) {
                if (err) return console.log(err)
                if(that.options.first_run) console.log('[' + getHours() + '] Comparing image / chunk');
                for (y = 0; y < img.bitmap.height; y++) {
                    for (x = 0; x < img.bitmap.width; x++) {

                        RGBimg = jimp.intToRGBA(img.getPixelColor(x, y))
                        RGBchunk = jimp.intToRGBA(chunk.getPixelColor(x, y))

                        var arrayRGB = `[${RGBimg.r},${RGBimg.g},${RGBimg.b}]`

                        if (RGBimg.a == 255) {

                            if (typeof colorsIds[arrayRGB] != "undefined") {

                                template[`${x+images[that.options.num].x},${y+images[that.options.num].y}`] = colorsIds[arrayRGB]

                                that.options.template_pixels++
                                if (arrayRGB != `[${RGBchunk.r},${RGBchunk.g},${RGBchunk.b}]`) {

                                    function setpixel() {

                                        if(estrategy.startsWith("RAD") || estrategy.startsWith("LBU") || estrategy.startsWith("LUB"))
                                            pre.push([x, y, colorsIds[arrayRGB]])
                                        else pixels[`${x+images[that.options.num].x},${y+images[that.options.num].y}`] = colorsIds[arrayRGB]

                                        let red = jimp.rgbaToInt(255, 0, 0, 255);
                                        chunk.setPixelColor(red, x, y)

                                    }

                                    if(estrategy.indexOf("#") != -1) {
                                        if(RGBchunk.r + RGBchunk.g + RGBchunk.b < 765) setpixel()
                                    } else if(estrategy.indexOf("$") != -1) {
                                        if(RGBchunk.r + RGBchunk.g + RGBchunk.b == 765)  setpixel()
                                    } else setpixel()

                                } else {
                                    let opacity = jimp.rgbaToInt(RGBchunk.r, RGBchunk.g, RGBchunk.b, 30);
                                    chunk.setPixelColor(opacity, x, y)
                                }
                            }
                        }
                    }
                }

                if(that.options.first_run) console.log('[' + getHours() + '] Waiting 20 seconds');
                chunk.write('./difference/' + images[that.options.num].png)

                if(estrategy.startsWith("RAD")) {
                    let offx = 0,
                        offy = 0;

                    switch (estrategy) {

                        case "RADTL": offy = offx = 0; break;
                        case "RADTR": offx = that.options.w; break;
                        case "RADBL": offy = that.options.h; break;
                        case "RADBR": 
                            offx = that.options.w;
                            offy = that.options.h;
                        break;
                        default:
                            offx = that.options.w / 2;
                            offy = that.options.h / 2;
                    }

                    pre.sort((a, b) => dist(a[0] - offx, a[1] - offy) - dist(b[0] - offx, b[1] - offy));

                    for(let i = 0; i < pre.length; i++) {
                        pixels[`${pre[i][0]+images[that.options.num].x},${pre[i][1]+images[that.options.num].y}`] = pre[i][2]
                    }

                } else if(estrategy.startsWith("LBU") || estrategy.startsWith("LUB")) {
                    let sortY,
                        sorted;
                        console.log(estrategy)

                    switch (estrategy.substring(0,3)) {
                        case 'LBU': 
                            sortY = pre.sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
                            sorted = sortY.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                        break;
                        case 'LUB':
                            sortY = pre.sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
                            sorted = sortY.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
                        break;
                    }

                    for(let i = 0; i < sorted.length; i++) {
                        pixels[`${sorted[i][0]+images[that.options.num].x},${sorted[i][1]+images[that.options.num].y}`] = sorted[i][2]
                    }
                }

                that.options.first_run = false
                that.net.ready = true

                if(estrategy.indexOf('#') >= 0 || estrategy.indexOf('$') >= 0) {
                    images[that.options.num].estrategy = estrategy.substring(0,estrategy.length-1)
                }

                that.paint()
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

            if (a4 >= images[that.options.num].x && a4 <= (images[that.options.num].x + that.options.w) - 1 && a5 >= images[that.options.num].y && a5 <= (images[that.options.num].y + that.options.h) - 1 && typeof template[`${a4},${a5}`] != "undefined") {
                that.insta_defense(a4, a5, a3[0x4 + a6])
            }
        }
    }

    that.insta_defense = function(x, y, c) {

            let event = {"date": getHours(),"event": false,"x": x,"y": y,"c": c}

            if (template[`${x},${y}`] != c) {

                defense[`${x},${y}`] = template[`${x},${y}`]
                event.event = "\x1b[41mAttack\x1b[0m"
                that.options.pixels.attacks++

            } else {

                if (typeof defense[`${x},${y}`] != "undefined") {
                    delete defense[`${x},${y}`]
                    delete pixels[`${x},${y}`]
                    event.event = "\x1b[32mDefense\x1b[0m"
                    that.options.pixels.attacks--

                } else if (typeof pixels[`${x},${y}`] != "undefined") {
                    delete pixels[`${x},${y}`]
                    event.event = "\x1b[32mHelp\x1b[0m"
                }
            }
            if(event.event != false) output(event)


    }.bind(that);

    that.paint = function() {

        that.net.interval = setInterval(() => {
            for (i = 0; i < 10; i++) {
                if(Object.keys(pixels).length == 0 && that.net.ready == true) {
                    console.log('[' + getHours() + '] ' + images[that.options.num].png.replace(".png","") + ', finished')
                    clearInterval(that.net.interval)
                    that.net.ready = false
                    imageReader(that.options.num+1)
                    return;
                }
                if(that.net.ready) painter(images[that.options.num].estrategy)
            }
        }, 5000);

        setInterval(() => {
            if(Object.keys(pixels).length == 0) {
                return;
            }

            that.options.pixels.time = (Object.keys(pixels).length*2) / that.options.pixels.last_minute
            that.options.pixels.time = parseDuration(that.options.pixels.time*30000)
            that.options.pixels.last_minute = 0

        }, 60000);
    }.bind(that);

}

run = async function() {
    setTimeout(() => {console.log('ignore')}, 100000000);
    if(!config[0] || !config[1]) return console.log('[' + getHours() + '] no tokens have been defined or are correct configured, follow the steps of github')

    if(!fs.existsSync('./difference')) fs.mkdirSync('./difference');
    if(!fs.existsSync('./chunks')) fs.mkdirSync('./chunks');
    if(!fs.existsSync('./timelapse')) fs.mkdirSync('./timelapse');

    fs.readdir(process.cwd(), function(err, files) {
        if (err) return console.log(err);

        for (i = 0; i < files.length; i++) {
            if (require('path').extname(files[i]) == ".png") {
                
                let png = files[i].replace(".png", ""), set = png.split("_"), estrategy = ["LBUCH","LUBCH","LBU","LUB","RADOT","LUL","LBR","RDM","JMP","LBRCH","LULCH",'RAD','RADTL','RADCH','RADOTCH','RADTR','RADBL','RADBR'], timer = 0

                if(png.indexOf("_") == -1 || set.length <= 2 || isNaN(set[0]) == true) {
                    continue;
                };

                if(!set[3]) {

                    estrategy = "LUL"

                } else if(set[3].indexOf('#') >= 0 || set[3].indexOf('$') >= 0) {

                    if(estrategy.indexOf(set[3].substring(0,set[3].length-1).toUpperCase()) == -1) {
                        estrategy = "LUL"
                    } else estrategy = set[3].toUpperCase()
                    
                } else {
                    estrategy = set[3].toUpperCase()
                };

                if(set[4] && isNaN(parseInt(set[4])) == false && set[4] > 0) {
                    timer = parseInt(set[4])

                    if(!fs.existsSync('./timelapse/' + png + '.png')) fs.mkdirSync('./timelapse/' + png + '.png')
                };

                images[set[0]] = {"png": png + ".png", "estrategy": estrategy, "x": parseInt(set[1]), "y": parseInt(set[2]), "timer": timer}
            }
        }
        
        if(!images[0]) {
            return console.log('[' + getHours() + "] Image name must match: Queue_X_Y_Estrategy_TimelapseTimer, Example: 0_-30_70_LUF_120(optional)")
        } else {
            var filtered = images.filter(function (el) {
                return el != null;
            });
            images = filtered
            
            console.table(images)
            imageReader(0)
        };
    })
}

imageReader = function(num) {
    if(!images[num]) num = 0

    jimp.read('./' + images[num].png, function(err, img) {
        if(err) return console.log(err)
        console.log('[' + getHours() + '] Starting: (' + images[num].png + ') press "b" or "n" for more information')

        images[num].chunks = []

        let w = Math.floor((images[num].x + img.bitmap.width) / 256);
        let h = Math.floor((images[num].y + img.bitmap.height) / 256);
        let x = Math.floor(images[num].x / 256);
        let y = Math.floor(images[num].y / 256);

        for (iy = y; iy < h + 1; iy++) {
            for (ix = x; ix < w + 1; ix++) {
                if (iy != 16 && ix != 16) {

                    let tx = (images[num].x - (ix * 256)) * -1;
                    let ty = (images[num].y - (iy * 256)) * -1;
                    let key = ((iy & 0x1f) << 0x5) + (ix & 0x1f)

                    images[num].chunks.push([ix, iy, tx, ty, key]);
                }
            }
        }

        if(!bots[0]) {
            let bot;
            bot = bots[0] = new Bot(i);
        }
        bots[0].start(img.bitmap.width, img.bitmap.height, num)
    })
}

require('readline').emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        process.exit();
    } else if(key.name === 'b'){

        let output = [{"Template": images[bots[0].options.num].png.replace(".png",""), "Estrategy": images[bots[0].options.num].estrategy, "X,Y": [images[bots[0].options.num].x,images[bots[0].options.num].y].join(","), "Token": config[1].substring(5,0) + '*'.repeat(3) + config[1].substring(config[1].length, config[1].length-5), "Id": bots[0].options.id}]
        console.table(output)

    } else if(key.name === 'n' && bots[0]) {

        let percentage = (Object.keys(pixels).length / bots[0].options.template_pixels).toFixed(2)

        let output = [{"Last Minute": bots[0].options.pixels.last_minute,"Remaining Pixels": Object.keys(pixels).length + '/' + bots[0].options.template_pixels,"Time Left": JSON.stringify(bots[0].options.pixels.time).replace(/[{}"]/g,''),"Attacks": bots[0].options.pixels.attacks, [(percentage * 100 -100)*-1 + '%']: '█'.repeat(10 - (percentage*10)) + '░'.repeat(percentage*10) }]
        console.table(output)
    }
})

let jump_pixels = 0

painter = function(estrategy) {

    if (Object.keys(defense).length > 0) {
        estrategy = "Defense"
    } else var arrayPixel = Object.keys(pixels)

    let x, y, c, XY

    paint_LinearUpperLeft = function() {
        XY = arrayPixel[0]
        c = pixels[arrayPixel[0]]
    }

    paint_LinearBottomRight = function() {
        XY = arrayPixel[arrayPixel.length - 1]
        c = pixels[arrayPixel[arrayPixel.length - 1]]
    }

    paint_Jump = function() {
        XY = arrayPixel[placed_pixels * 2]
        c = pixels[arrayPixel[placed_pixels * 2]]
    }

    paint_Random = function() {
        let random_pixel = Math.floor(Math.random() * ((Object.keys(pixels).length - 1) - 0) + 0)

        XY = arrayPixel[random_pixel]
        c = pixels[arrayPixel[random_pixel]]
    }

    paint_ChessUpper = function() {
        for(let i = jump_pixels; i < Object.keys(pixels).length -1; i++) {
            XY = arrayPixel[i]

            x = parseInt(XY.substring(0, XY.indexOf(',')))
            y = parseInt(XY.substring(XY.indexOf(',') + 1, XY.length))

            if(Math.abs((x + y) % 2) == 0) {
                c = pixels[arrayPixel[i]]
                break;
            }

            jump_pixels++
        }

        if(typeof c == "undefined") paint_LinearUpperLeft()
    }

    paint_ChessBottom = function() {
        let i = Object.keys(pixels).length - jump_pixels

        if(i < 0) return paint_LinearBottomRight()

        while(i--) {
            XY = arrayPixel[i]

            x = parseInt(XY.substring(0, XY.indexOf(',')))
            y = parseInt(XY.substring(XY.indexOf(',') + 1, XY.length))

            if(Math.abs((x + y) % 2) == 0) {
                c = pixels[arrayPixel[i]]
                break;
            }

            jump_pixels++
        }

        if(typeof c == "undefined") paint_LinearBottomRight()
    }

    Defense = function() {
        let array_defense = Object.keys(defense)
        XY = array_defense[0]
    
        c = defense[array_defense[0]]
    }

    switch (estrategy) {

        case "LUB": case "LBU": case "RAD": case "RADTL": case "RADTR": case "RADBL": case "RADBR": case "LUL": paint_LinearUpperLeft(); break;
        case "RADOT": case "LBR": paint_LinearBottomRight(); break;
        case "RDM": paint_Random(); break;
        case "JMP": paint_Jump(); break;
        case "LBUCH": case "LUBCH": case "RADCH": case "LULCH": paint_ChessUpper(); break;
        case "RADOTCH": case "LBRCH": paint_ChessBottom(); break;
        case "Defense": Defense(); break;

        default: paint_LinearUpperLeft()
    }

    x = parseInt(XY.substring(0, XY.indexOf(',')))
    y = parseInt(XY.substring(XY.indexOf(',') + 1, XY.length))

    if(estrategy == "Defense") {
        delete defense[`${x},${y}`]
    } else {
        delete pixels[`${x},${y}`]
        bots[0].options.pixels.placed_pixels++
    }

    bots[0].pixel(x, y, c)
}

getHours = function() {
    let date = new Date();

    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ':' + minutes + ':' + seconds
}
 
output = function(pixel) {
    if(pixel.event != "Attack") {
        bots[0].options.pixels.last_minute++
    } else {
        bots[0].options.pixels.last_minute--
        bots[0].options.pixels.attacks++
    }

    console.log("[" + pixel.date + "] " + pixel.event + " > " + pixel.x + "," + pixel.y + " " + pixel.c)   
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

function dist(x, y) {
    return Math.sqrt(x * x + y * y);
}

run();

function parseDuration(duration) {
    let remain = duration
  
    let days = Math.floor(remain / (1000 * 60 * 60 * 24))
    remain = remain % (1000 * 60 * 60 * 24)
  
    let hours = Math.floor(remain / (1000 * 60 * 60))
    remain = remain % (1000 * 60 * 60)
  
    let minutes = Math.floor(remain / (1000 * 60))
    remain = remain % (1000 * 60)
  
    let seconds = Math.floor(remain / (1000))
    remain = remain % (1000)
  
    if(days > 0) {
        return {days,hours,minutes,seconds};
    } else if(hours > 0) {
        return {hours,minutes,seconds};
    } else if(minutes > 0) {
        return {minutes,seconds};
    }

    return {seconds}
}

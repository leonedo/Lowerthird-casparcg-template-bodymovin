// version 1.04 template index made by heine.froholdt@gmail.com

let isOn = false;
let framesMilliseconds;
let fontsLoaded = false;
let animLoaded = false;
let animElementsLength;
let markers = {}
let markersLoop = {}

//loop handling
let loopExits = false;
let loopAnimation = false;
let loopDelay = 0;
let loopExternal = false;
let loopRepeat;
let loopDuration = 0;
let loopTiming;


//update
let updateAnimation = false;
let updateDelay = 0;
let nextAnimation;
let imagesReplace = {};


let animContainer = document.getElementById('bm');
let loopContainer = document.getElementById('loop');


const loadAnimation = (data, container) => {
    console.log('loading ' + data)
    return lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: data
    });
}

let anim = loadAnimation('data.json', animContainer)
let externalLoop;

//add font-face from data.json  
const addFont = (fam, path) => {
    let newFont = document.createElement('style')
    newFont.appendChild(document.createTextNode(`\
    @font-face {\
        font-family: ${fam};\
        src: url('${path}');\
    }\
    `));
    document.head.appendChild(newFont);
}


//checking if the animation is ready
const makeAnimPromise = () => {
    return new Promise(function (resolve, reject) {
        if (animLoaded) {
            resolve('Animation ready to play')
        } else {
            anim.addEventListener('DOMLoaded', function (e) {
                animLoaded = true;
                resolve('Animation ready to play')
            });
        }
    })
};


const isMarker = (obj, keyItem, markerName) => {
    return new Promise((resolve, reject) => {
        let markers = obj.markers
        markers.forEach((item, index) => {
            for (let key in item) {
                if (item[key][keyItem] === markerName) {
                    resolve(true)
                } else if (item.length === key) {
                    reject(false)
                }
            }
        })
    })
}

const getMarkerValue = (obj, keyItem, defaultValue) => {
    return new Promise((resolve, reject) => {
        let markers = obj.markers
        markers.forEach((item, index) => {
            for (let key in item) {
                if (item[key].hasOwnProperty(keyItem)) {
                    resolve(item[key][keyItem])
                } else if (item.length === key) {
                    reject(defaultValue)
                }
            }
        })
    })
}



//anim ready
anim.addEventListener('config_ready', function (e) {
    //setting the animation framerate
    let mainAnimation = anim.renderer.data
    framesMilliseconds = 1000 / mainAnimation.fr

    if (anim.hasOwnProperty('markers')) {
        anim.markers.forEach((item, index) => {
            markers[item.payload.name] = item;

        })
    }
    //checking for a loop in the animation
    isMarker(anim, 'name', 'loop').then((res) => {
        loopAnimation = res

        if (res) {
            loopExits = true;
            getMarkerValue(anim, 'loopDelay', 0).then((res) => {
                loopDelay = Number(res)
            })
            getMarkerValue(anim, 'loopExternal', false).then((res) => {
                loopExternal = (res === 'true')

                //handling of external loop
                if (loopExternal) {

                    externalLoop = loadAnimation('loop.json', loopContainer)
                    if (externalLoop.hasOwnProperty('markers')) {
                        externalLoop.markers.forEach((item, index) => {
                            markersLoop[item.payload.name] = item;
                
                        })
                    }
                    externalLoop.addEventListener('complete', () => {
                        if (nextAnimation !== 'stop') {
                            loopRepeat = setTimeout(() => {
                                externalLoop.goToAndPlay('loop', true);
                            }, framesMilliseconds * loopDelay)

                        } else if (isOn && nextAnimation === 'stop') {
                            externalLoop.goToAndPlay('stop', true);
                            anim.goToAndPlay('stop', true)
                            nextAnimation === 'no animation'
                            isOn = false;
                        }

                    })
                }


            })
            if(!loopExternal){
                loopDuration = markers['loop']['duration']
            } else {
                loopDuration = markersLoop['loop']['duration']
            }
          
        }
    })
    //checking for a update animation in the animation 
    isMarker(anim, 'name', 'update').then((res) => {
        updateAnimation = res
        if (res) {
            getMarkerValue(anim, 'updateDelay', 0).then((res) => {
                updateDelay = Number(res)
            })
        }
    })

    //Add fonts to style
    if (!fontsLoaded && anim.renderer.data.fonts) {
        let fonts = anim.renderer.data.fonts.list;
        for (const font in fonts) {
            let family = fonts[font].fFamily
            let fontPath = fonts[font].fPath
            if (fontPath !== '') {
                addFont(family, fontPath)
            }
        }
    }

});

const animPromise = makeAnimPromise()

webcg.on('data', function (data) {
    let updateTiming = 0
    console.log('data from casparcg received')
    const keysToDelete = [];
    for (const key of Object.keys(data)) {
        console.log(`${key} = ${data[key]}`);
        if (key.includes("opacidad")) {
            checkandupdate_opacidad(key, data[key]);
            keysToDelete.push(key);
        }

        if (key.includes("color")) {
            checkandupdate_color(key, data[key]);
            keysToDelete.push(key);
        }
    }

    // remove after iteration
    for (const key of keysToDelete) {
        delete data[key];
    }

    animPromise.then(resolve => {
            if (anim.currentFrame !== 0 && updateAnimation) {
                updateTiming = framesMilliseconds * (updateDelay + loopTiming)
                if (anim.isPaused && isOn) {
                    anim.goToAndPlay('update', true)
                    if (!loopExternal) {
                        clearTimeout(loopRepeat);
                    }

                } else {
                    loopAnimation = false;
                    nextAnimation = 'update'
                }
            } else if(!loopExternal && loopExits && anim.isPaused) {
                anim.goToAndPlay('loop', true)
            }

            let imageElements = animContainer.getElementsByTagName("image");
            animElementsLength = anim.renderer.elements.length;
            console.log(resolve)

            setTimeout(() => {
                for (let i = 0; i < animElementsLength; i++) {
                    var animElement = anim.renderer.elements[i];
                    if (
                        animElement.hasOwnProperty('data') && animElement.data.hasOwnProperty('cl') &&
                        data && data.hasOwnProperty(animElement.data.cl)
                    ) {
                        let cl = animElement.data.cl;
                        let newPath;

                       if (animElement.data.hasOwnProperty('refId') && animElement.data.refId.includes('image')) {
                            // Get the new path to apply
                            newPath = data[cl] ? data[cl].text || data[cl] : '';
                        
                            // Optional: determine current searchPath for tracking
                            let searchPath;
                            const refId = animElement.data.refId;
                        
                            const asset = anim.assets.find(item => item.id === refId);
                               if (asset) {
                                searchPath = imagesReplace.hasOwnProperty(refId)
                                    ? imagesReplace[refId]
                                    : `${asset.u}${asset.p}`;
                            }
                        
                            // Get the class name from animElement.data.cl or elsewhere
                               const groupClass = cl; // assuming cl = "logovisitab4", etc.
                               const group = document.querySelector(`g.${groupClass}`);
                            const image = group ? group.querySelector('image') : null;
                        
                            if (image) {
                                // Update the image href to the new path
                                image.setAttribute('href', newPath); // preferred in modern SVG
                              //  image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', newPath); // for compatibility
                        
                                   // Store the new path in the imagesReplace cache
                                imagesReplace[refId] = newPath;
                            }


                        } else {
                            try {
                                animElement.canResizeFont(true);
                                animElement.updateDocumentData({
                                    t: data[cl] ? data[cl].text || data[cl] : ''
                                }, 0);

                            } catch (err) {
                                console.log(err)
                            }
                        };
                    }
                }

            }, updateTiming);

        })
        .catch(error => console.log(error))
});


//what to do everytime main animation is done playing
anim.addEventListener('complete', () => {

    if (loopAnimation && isOn && !loopExternal) {
        loopRepeat = setTimeout(() => {
            anim.goToAndPlay('loop', true);
        }, framesMilliseconds * loopDelay)

    } else if (nextAnimation === 'stop' && isOn && !loopExternal) {
        anim.goToAndPlay(nextAnimation, true)
        isOn = false

    } else if (isOn && nextAnimation !== 'no animation' && !loopExternal) {
        anim.goToAndPlay(nextAnimation, true)
        if (loopExits && !loopExternal) {
            loopAnimation = true;

        }

        nextAnimation = 'no animation'
    }
})

//Custom functions for color and opacity changes
function update_color(campo, color) {
    const elements = document.querySelectorAll(`.${campo}`);
    if (elements.length === 0) {
        console.warn(`⚠️ update_color: No elements found for class "${campo}"`);
    }
    elements.forEach(el => {
        el.style.setProperty("fill", color);
        console.log(`✅ update_color: Applied color "${color}" to .${campo}`);
    });
}

function update_opacidad(campo, value) {
    const elements = document.querySelectorAll(`.${campo}`);
    if (elements.length === 0) {
        console.warn(`⚠️ update_opacidad: No elements found for class "${campo}"`);
    }
    elements.forEach(el => {
        el.style.setProperty("opacity", value);
        console.log(`✅ update_opacidad: Applied opacity "${value}" to .${campo}`);
    });
}

function normalizeValue(v) {
    if (typeof v === "object" && v !== null && "text" in v) return v.text;
    return v;
}

function checkandcolor(item, colorData, attempts = 0) {
    const color = normalizeValue(colorData);
    const maxAttempts = 10;
    const selector = `.${item}`;

    if (document.querySelector(selector)) {
        console.log(`✅ checkandcolor: Element "${item}" exists, applying color "${color}"`);
        update_color(item, color);
    } else if (attempts < maxAttempts) {
        console.log(`⏳ checkandcolor: Element "${item}" not found, retrying (attempt ${attempts + 1})`);
        setTimeout(() => checkandcolor(item, colorData, attempts + 1), 100);
    } else {
        console.error(`❌ checkandcolor: Failed to find element "${item}" after ${maxAttempts} attempts`);
    }
}

function checkandupdate(item, valueData, attempts = 0) {
    const value = normalizeValue(valueData);
    const maxAttempts = 10;
    const selector = `.${item}`;

    if (document.querySelector(selector)) {
        console.log(`✅ checkandupdate: Element "${item}" exists, applying opacity "${value}"`);
        update_opacidad(item, value);
    } else if (attempts < maxAttempts) {
        console.log(`⏳ checkandupdate: Element "${item}" not found, retrying (attempt ${attempts + 1})`);
        setTimeout(() => checkandupdate(item, valueData, attempts + 1), 100);
    } else {
        console.error(`❌ checkandupdate: Failed to find element "${item}" after ${maxAttempts} attempts`);
    }
}




//casparcg control
webcg.on('play', function () {
    animPromise.then((resolve) => {
        console.log('play')
        anim.goToAndPlay('play', true);
        if (loopExits && loopExternal) {
            externalLoop.goToAndPlay('play', true);
        }
        isOn = true;
         nextAnimation = 'no animation';
    });

});

webcg.on('stop', function () {
    console.log('stop')
    clearTimeout(loopRepeat);
    loopAnimation = false;
    nextAnimation = 'stop'

    if (anim.isPaused) {
        if (!loopExternal) {
            anim.goToAndPlay('stop', true)
            isOn = false
        }

        if (loopExits && loopExternal && externalLoop.isPaused) {
            externalLoop.goToAndPlay('stop', true);
            anim.goToAndPlay('stop', true)
            isOn = false
        }
    }

});

webcg.on('playAnimation', function (animationName) {
    console.log('playAnimation ' + animationName)
    anim.goToAndPlay(animationName, true);
});

webcg.on('update', function () {
    if (!loopExternal) {
        clearTimeout(loopRepeat);
    }

    if (anim.isPaused || loopExternal) {
        loopTiming = 0

    } else if (isOn) {
        loopTiming = loopDuration - Math.round(anim.currentFrame)

    }
});


let sfxPlayed = false; // prevent it from playing multiple times
//let  audio_inframe = 0; // set this to the frame you want the sound to play

anim.addEventListener('enterFrame', (e) => {
    const currentFrame = e.currentTime;

    // Play sound only if audio_inframe exists and is valid
    if (
        typeof audio_inframe === 'number' &&
        !Number.isNaN(audio_inframe) &&
        currentFrame >= audio_inframe &&
        !sfxPlayed
    ) {
        const audio = document.getElementById('sfxOut');
        if (audio) {
            audio.volume = 1.0;
            audio.currentTime = 0;
            audio.play();
            sfxPlayed = true;
        }
    }
});


// clock: time and date formatters and updaters

const ENABLE_CLOCK = window.ENABLE_CLOCK === true;

const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});

const dateFormatter = new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
});

function updateLottieText(className, text) {
    for (let i = 0; i < anim.renderer.elements.length; i++) {
        const el = anim.renderer.elements[i];

        if (
            el.data &&
            el.data.cl === className &&
            typeof el.updateDocumentData === 'function'
        ) {
            try {
                el.canResizeFont(true);
                el.updateDocumentData({ t: text }, 0);
            } catch (e) {
                console.log('[Clock] Failed to update', className, e);
            }
            return;
        }
    }
}

function updateClock() {
    const now = new Date();
    updateLottieText('time', timeFormatter.format(now));  // name of the time class
    updateLottieText('date', dateFormatter.format(now));  // name of the date class
}

animPromise.then(() => {
    if (!ENABLE_CLOCK) {
        return;
    }

    updateClock();
    setInterval(updateClock, 10 * 1000); // update every 10 seconds
});
/* Gerado por tools/tokens/build.cjs a partir de tokens/vila.tokens.json. Não editar à mão. Versão 1.0.0. Cores em hex, dimensões em px e durações em ms. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VILA_TOKENS = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function freeze(o) { Object.values(o).forEach(function (v) { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(o); }
  return freeze({
    "version": "1.0.0",
    "color": {
      "runtime": {
        "grass": "#b4a332",
        "grassHi": "#c4af35",
        "grassLo": "#8d8438",
        "grassDark": "#4e6326",
        "path": "#eeab56",
        "pathHi": "#f5bb67",
        "pathLo": "#c78b3f",
        "ink": "#432c22",
        "soil": "#81772d",
        "water": "#146b99",
        "waterDeep": "#146490",
        "waterHi": "#3096b7",
        "foam": "#53b6b3",
        "leaf": "#a89c3d",
        "leafHi": "#cebc47",
        "leafLo": "#646435",
        "leafDeep": "#3b4230",
        "wood": "#7e4d2c",
        "woodHi": "#c47c3a",
        "woodLo": "#422a21",
        "straw": "#d88d3f",
        "strawHi": "#fabb5e",
        "strawLo": "#b06a30",
        "cream": "#f3d195",
        "creamHi": "#f8dfa2",
        "creamLo": "#cba672",
        "terra": "#c5642c",
        "terraHi": "#f18c3a",
        "skin": "#f19f55",
        "skinHi": "#f7b467",
        "skinLo": "#864f2d",
        "stone": "#8e7565",
        "stoneHi": "#d6ba9a",
        "stoneLo": "#5c4e42",
        "outline": "#2f1f1b",
        "hair": "#3d2a25",
        "hairHi": "#583a2f",
        "sash": "#cf562d",
        "sashLo": "#8d3d27",
        "sand": "#f3b15b",
        "sandDark": "#e19d4e",
        "tuft": "#62722c",
        "tuftHi": "#9e943b",
        "waterLight": "#4aacbd",
        "foamHi": "#5ec2c2",
        "reed": "#888238",
        "fire": "#e84115",
        "fireMid": "#f78b14",
        "fireHi": "#fbc114",
        "fireCore": "#fbe88f",
        "ash": "#4f352e",
        "paper": "#fdf3cd",
        "wool": "#f4daa6",
        "inline": {
          "drawShelter": {
            "1": "#788033",
            "2": "#69552c",
            "3": "#876a34",
            "4": "#9a7a3c",
            "5": "#70552b",
            "6": "#655025",
            "7": "#977b3b",
            "8": "#80672e",
            "9": "#b19a50",
            "10": "#594322",
            "11": "#4d3b23",
            "12": "#625b35",
            "13": "#3d3220",
            "14": "#5c4321",
            "15": "#d0b257",
            "16": "#a88835",
            "17": "#dfc469",
            "18": "#d5b859",
            "19": "#ac8c3e",
            "20": "#d9bd65",
            "21": "#9e7e37"
          },
          "drawOlive": {
            "1": "#7b832b",
            "2": "#6b7729",
            "3": "#9da64c",
            "4": "#7e9550",
            "5": "#a7ad51",
            "6": "#537336",
            "7": "#869b57"
          },
          "drawBoat": {
            "1": "#125e7d",
            "2": "#8c552a",
            "3": "#543d25",
            "4": "#a97838",
            "5": "#be8a44",
            "6": "#c7984c"
          },
          "drawNet": {
            "1": "#9a9460"
          },
          "drawJar": {
            "1": "#7b772f",
            "2": "#e1a15b",
            "3": "#7c462a"
          },
          "drawBasket": {
            "1": "#7f7d36"
          },
          "topLevel": {
            "1": "#db8545",
            "2": "#96582b",
            "3": "#ad6433",
            "4": "#5a321c",
            "5": "#93796d",
            "6": "#e1b97e",
            "7": "#767c3b",
            "8": "#556033",
            "9": "#52667d",
            "10": "#42556a",
            "11": "#33415a",
            "12": "#b8462d",
            "13": "#863223",
            "14": "#f3ad52",
            "15": "#e8a246"
          },
          "renderWorld": {
            "1": "#f8af40"
          }
        }
      },
      "reference": {
        "outline": {
          "1": "#2f1f1b",
          "2": "#432c22"
        },
        "grass": {
          "1": "#707d2b",
          "2": "#b4a332",
          "3": "#bba833",
          "4": "#c4af35"
        },
        "groundShadow": {
          "1": "#81772d"
        },
        "foliage": {
          "1": "#3b4230",
          "2": "#646435",
          "3": "#a89c3d",
          "4": "#cebc47"
        },
        "bark": {
          "1": "#432c26",
          "2": "#774b34",
          "3": "#b27140"
        },
        "path": {
          "1": "#ce8e47",
          "2": "#e5a252",
          "3": "#eeab56",
          "4": "#f2b05a"
        },
        "sand": {
          "1": "#dc9a4b",
          "2": "#eeab56",
          "3": "#f3b15b"
        },
        "water": {
          "1": "#146490",
          "2": "#146b99",
          "3": "#3096b7",
          "4": "#4aacbd"
        },
        "shoreEdge": {
          "1": "#53b6b3"
        },
        "thatch": {
          "1": "#b06a30",
          "2": "#d88d3f",
          "3": "#fabb5e",
          "4": "#fdcb6e"
        },
        "wood": {
          "1": "#422a21",
          "2": "#7e4d2c",
          "3": "#c47c3a",
          "4": "#f3ad52"
        },
        "wicker": {
          "1": "#5a321c",
          "2": "#96582b",
          "3": "#e8a246"
        },
        "stone": {
          "1": "#4f4140",
          "2": "#64514d",
          "3": "#80685f",
          "4": "#93796d"
        },
        "terracotta": {
          "1": "#7f4024",
          "2": "#c5642c",
          "3": "#f18c3a"
        },
        "net": {
          "1": "#f4daa6",
          "2": "#fdf3cd"
        },
        "fire": {
          "1": "#e84115",
          "2": "#f8af40",
          "3": "#fbcd4b"
        },
        "hair": {
          "1": "#3d2a25",
          "2": "#583a2f"
        },
        "clothWhite": {
          "1": "#cba672",
          "2": "#f3d195",
          "3": "#f8dfa2"
        },
        "clothRed": {
          "1": "#8d3d27",
          "2": "#cf562d"
        }
      },
      "season": {
        "thatchB": {
          "1": "#ab7032",
          "2": "#dc9a4b",
          "3": "#fabb5e",
          "4": "#fdcb6e"
        },
        "stoneWall": {
          "1": "#906944",
          "2": "#aa7f55",
          "3": "#be9161",
          "4": "#f3d195"
        },
        "cypress": {
          "1": "#1f352b",
          "2": "#344933",
          "3": "#64743c"
        },
        "wheat": {
          "1": "#be8633",
          "2": "#e8a246",
          "3": "#fabd47",
          "4": "#fdd667"
        },
        "soil": {
          "1": "#5a321c",
          "2": "#7e4d2c",
          "3": "#9b6232"
        },
        "wool": {
          "1": "#f3d2a3",
          "2": "#f4daa6"
        },
        "sail": {
          "1": "#cc9d68",
          "2": "#f3d195"
        },
        "clothGreen": {
          "1": "#556033",
          "2": "#767c3b"
        },
        "clothBlue": {
          "1": "#42556a",
          "2": "#52667d"
        },
        "clothBrown": {
          "1": "#96582b",
          "2": "#e1b97e"
        },
        "clothRedC": {
          "1": "#863223",
          "2": "#b8462d"
        },
        "sky": {
          "1": "#84c7f8",
          "2": "#b0d7f3"
        },
        "farHills": {
          "1": "#839db9",
          "2": "#9db7ce"
        },
        "fog": {
          "1": "#b4b3ab",
          "2": "#c7c5c4",
          "3": "#cfcdcd"
        }
      },
      "skin": {
        "fisherman": {
          "1": "#96582b",
          "2": "#db8545",
          "3": "#f19f55"
        },
        "farmer": {
          "1": "#96582b",
          "2": "#f19f55",
          "3": "#f19f55"
        },
        "shepherd": {
          "1": "#96582b",
          "2": "#c47c3a",
          "3": "#d88d3f"
        },
        "carpenter": {
          "1": "#96582b",
          "2": "#f19f55",
          "3": "#f19f55"
        },
        "mason": {
          "1": "#864f2d",
          "2": "#ad6433",
          "3": "#b06a30"
        },
        "baker": {
          "1": "#aa6236",
          "2": "#f19f55",
          "3": "#f19f55"
        },
        "reference": {
          "1": "#864f2d",
          "2": "#f19f55",
          "3": "#f7b467"
        }
      },
      "ui": {
        "page": {
          "background": "#14231e",
          "text": "#f4e8cd"
        },
        "text": {
          "lead": "#d3d9bb",
          "body": "#bcc9ad",
          "eyebrow": "#bbc993",
          "headerLink": "#c7d4ad",
          "brandTagline": "#a5b293",
          "worldTop": "#b0bea3",
          "hint": "#a7b797",
          "residentNote": "#a9ba98",
          "details": "#b8c5a8",
          "small": "#a5b697",
          "version": "#829477",
          "footer": "#a0b090"
        },
        "accent": {
          "badge": "#d7bc78"
        },
        "button": {
          "background": "#2c4033",
          "backgroundHover": "#3d5540",
          "border": "#87976c77",
          "text": "#f4e8cd"
        },
        "focus": {
          "ring": "#ecd89f"
        },
        "cta": {
          "background": "#d3deac",
          "text": "#1d3025"
        },
        "canvas": {
          "background": "#c9b77e",
          "border": "#c5c8a552",
          "shadow": "#00000044"
        },
        "divider": {
          "header": "#ffffff1c",
          "section": "#ffffff20"
        },
        "mapNote": {
          "text": "#36402e",
          "background": "#eddeb98c"
        }
      },
      "light": {
        "nightTint": "#19264447",
        "fireGlow": "#f8af4024"
      }
    },
    "dimension": {
      "tile": 16,
      "atlas": 512,
      "viewWidthAtZoom1": 384,
      "character": {
        "frame": {
          "width": 32,
          "height": 48
        },
        "figure": {
          "width": 30,
          "height": 46
        }
      },
      "sprite": {
        "grass": {
          "width": 16,
          "height": 16
        },
        "sand": {
          "width": 16,
          "height": 16
        },
        "path": {
          "width": 16,
          "height": 16
        },
        "water": {
          "width": 16,
          "height": 16
        },
        "shelter": {
          "width": 144,
          "height": 136
        },
        "olive": {
          "width": 88,
          "height": 104
        },
        "boat": {
          "width": 88,
          "height": 48
        },
        "net": {
          "width": 48,
          "height": 56
        },
        "jar": {
          "width": 28,
          "height": 36
        },
        "basket": {
          "width": 28,
          "height": 28
        },
        "firepit": {
          "width": 48,
          "height": 32
        },
        "bread": {
          "width": 20,
          "height": 16
        },
        "rocks": {
          "width": 48,
          "height": 32
        },
        "reeds": {
          "width": 32,
          "height": 32
        },
        "bush": {
          "width": 32,
          "height": 24
        }
      },
      "referenceScale": {
        "hut": {
          "width": 129.1,
          "height": 116.9
        },
        "oliveLarge": {
          "width": 86.2,
          "height": 82.7
        },
        "oliveSmall": {
          "width": 73,
          "height": 72
        },
        "boat": {
          "width": 62.1,
          "height": 32.3
        },
        "jar": {
          "width": 21.8,
          "height": 25.8
        },
        "basket": {
          "width": 29.2,
          "height": 25.2
        },
        "firepit": {
          "width": 40.9,
          "height": 22.2
        },
        "net": {
          "width": 50.4,
          "height": 43.2
        },
        "rocks": {
          "width": 38.8,
          "height": 24.8
        },
        "houseStone": {
          "width": 126.3,
          "height": 89.8
        },
        "well": {
          "width": 58.3,
          "height": 66.1
        },
        "oven": {
          "width": 83.5,
          "height": 62.7
        },
        "sheep": {
          "width": 38.2,
          "height": 26.9
        },
        "sailboat": {
          "width": 83.5,
          "height": 97.6
        }
      },
      "light": {
        "fireGlowRadiusX": 37,
        "fireGlowRadiusY": 18
      },
      "font": {
        "canvasLabel": 8,
        "canvasWatermark": 10
      }
    },
    "number": {
      "world": {
        "compositionWidthTiles": 24,
        "compositionHeightTiles": 42,
        "pathWidthTiles": 1.8,
        "territoryMinX": -36,
        "territoryMaxX": 60,
        "territoryMinY": -24,
        "territoryMaxY": 72
      },
      "camera": {
        "zoomStart": 1.05,
        "zoomFollow": 1.15,
        "zoomMax": 2.5,
        "zoomMinFloor": 0.25,
        "zoomStep": 0.2,
        "devicePixelRatioMax": 2
      },
      "motion": {
        "walkSpeedTilesPerSecond": 4,
        "walkCycleFrames": 3
      },
      "light": {
        "nightMaxEpisode": 0.72
      },
      "scale": {
        "runtimePxPerReferenceArtPx": 2.099,
        "runtimePxPerReferenceArtPxSprites": 2.268,
        "runtimeToReferenceProportion": 1.08
      }
    },
    "duration": {
      "walkFrame": 166.667,
      "flameFrame": 200,
      "waterFrame": 500
    },
    "fontFamily": {
      "ui": "system-ui, sans-serif",
      "display": "Georgia",
      "canvas": "monospace"
    }
  });
});

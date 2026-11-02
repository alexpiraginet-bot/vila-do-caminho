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
        "grass": "#b3ae3f",
        "grassHi": "#c4bd4a",
        "grassLo": "#7b842d",
        "grassDark": "#617329",
        "path": "#e6ac62",
        "pathHi": "#efc079",
        "pathLo": "#c48a46",
        "ink": "#4a3825",
        "soil": "#947335",
        "water": "#1477a1",
        "waterDeep": "#19688a",
        "waterHi": "#3595b8",
        "foam": "#85b8aa",
        "leaf": "#71882c",
        "leafHi": "#9ba33c",
        "leafLo": "#4c6b2a",
        "leafDeep": "#344c27",
        "wood": "#8a592d",
        "woodHi": "#c68c43",
        "woodLo": "#634621",
        "straw": "#c3a44b",
        "strawHi": "#dfc66b",
        "strawLo": "#9c7b31",
        "cream": "#e4d4a1",
        "creamHi": "#f4e7b9",
        "creamLo": "#b5a171",
        "terra": "#a36035",
        "terraHi": "#d28b4b",
        "skin": "#bd8854",
        "skinHi": "#dfa872",
        "skinLo": "#8f603b",
        "stone": "#8e8b6b",
        "stoneHi": "#b0aa83",
        "stoneLo": "#65684e",
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
          "drawFirepit": {
            "1": "#8c8038",
            "2": "#55452a",
            "3": "#9c4e24"
          },
          "drawCharacter": {
            "1": "#899252",
            "2": "#a4aa6c",
            "3": "#596e3f",
            "4": "#685637",
            "5": "#92582e",
            "6": "#947642",
            "7": "#ba7b42",
            "8": "#392d20",
            "9": "#51402a",
            "10": "#3f3122",
            "11": "#57402a",
            "12": "#493421",
            "13": "#63492b"
          },
          "createAtlas": {
            "1": "#d7ad60"
          },
          "terrainBase": {
            "1": "#afaa3c",
            "2": "#b8b344",
            "3": "#dca45a",
            "4": "#beb748",
            "5": "#a4a13a"
          },
          "terrain": {
            "1": "#287f9b",
            "2": "#2c86a0",
            "3": "#aeb454",
            "4": "#b4b95c",
            "5": "#3997ad",
            "6": "#2a88a7"
          },
          "flame": {
            "1": "#a54b24",
            "2": "#e57824",
            "3": "#f3ad39",
            "4": "#f8d77a",
            "5": "#c5c19a",
            "6": "#efb94b"
          },
          "renderWorld": {
            "1": "#f1c258"
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
          "2": "#e1953c",
          "3": "#f7b557",
          "4": "#fdcd71"
        },
        "stoneWall": {
          "1": "#906944",
          "2": "#aa7f55",
          "3": "#be9161",
          "4": "#f7ce8f"
        },
        "cypress": {
          "1": "#1f352b",
          "2": "#344933",
          "3": "#64743c"
        },
        "wheat": {
          "1": "#c68c43",
          "2": "#efa131",
          "3": "#fabd47",
          "4": "#fdd667"
        },
        "soil": {
          "1": "#51311c",
          "2": "#794925",
          "3": "#9b6232"
        },
        "wool": {
          "1": "#f3d2a3",
          "2": "#fce4b5"
        },
        "sail": {
          "1": "#cc9d68",
          "2": "#f7ce92"
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
          "1": "#8f603b",
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
          "1": "#9f572c",
          "2": "#db8545",
          "3": "#f4a45c"
        },
        "farmer": {
          "1": "#93542f",
          "2": "#f1a057",
          "3": "#f4a75f"
        },
        "shepherd": {
          "1": "#a36035",
          "2": "#cc7a38",
          "3": "#d28b4b"
        },
        "carpenter": {
          "1": "#8a592d",
          "2": "#ee9e55",
          "3": "#f5a85e"
        },
        "mason": {
          "1": "#894a26",
          "2": "#a36035",
          "3": "#b56a36"
        },
        "baker": {
          "1": "#a36035",
          "2": "#f1a056",
          "3": "#f4a75c"
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
        "fireGlow": "#f1c25824"
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
          "width": 24,
          "height": 40
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
          "width": 109.4,
          "height": 99.1
        },
        "oliveLarge": {
          "width": 73.1,
          "height": 70.1
        },
        "oliveSmall": {
          "width": 61.9,
          "height": 61
        },
        "boat": {
          "width": 52.7,
          "height": 27.4
        },
        "jar": {
          "width": 18.5,
          "height": 21.9
        },
        "basket": {
          "width": 24.7,
          "height": 21.4
        },
        "firepit": {
          "width": 34.7,
          "height": 18.9
        },
        "net": {
          "width": 42.7,
          "height": 36.7
        },
        "rocks": {
          "width": 32.9,
          "height": 21
        },
        "houseStone": {
          "width": 107.1,
          "height": 76.1
        },
        "well": {
          "width": 49.5,
          "height": 56
        },
        "oven": {
          "width": 70.8,
          "height": 53.2
        },
        "sheep": {
          "width": 32.4,
          "height": 22.8
        },
        "sailboat": {
          "width": 70.8,
          "height": 82.7
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
        "runtimePxPerReferenceArtPx": 1.779,
        "runtimeToReferenceProportion": 1.29
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

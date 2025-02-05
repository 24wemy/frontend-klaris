// Viseme mapping for lip sync
export const VISEME_MAP = {
    A: "viseme_PP",
    B: "viseme_kk",
    C: "viseme_I",
    D: "viseme_AA",
    E: "viseme_O",
    F: "viseme_U",
    G: "viseme_FF",
    H: "viseme_TH",
    X: "viseme_PP"
};

// Predefined facial expressions
export const FACIAL_EXPRESSIONS = {
    default: {},
    bigSmile: {
        browInnerUp: 0.5,         
        eyeSquintLeft: 0.5,       
        eyeSquintRight: 0.5,
        mouthSmileLeft: 0.7,     
        mouthSmileRight: 0.7,
        noseSneerLeft: 0.5,   
        noseSneerRight: 0.5,          
        cheekPuff: 0.2          
    },
    smallSmile: {
        browInnerUp: 0.3,        
        eyeSquintLeft: 0.4,       
        eyeSquintRight: 0.4,
        mouthSmileLeft: 0.6,      
        mouthSmileRight: 0.6,
        noseSneerLeft: 0.2,       
        noseSneerRight: 0.2,
        cheekPuff: 0.2            
    }
};
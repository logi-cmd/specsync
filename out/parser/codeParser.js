"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeParser = void 0;
const path = __importStar(require("path"));
const javaLikeParser_1 = require("./javaLikeParser");
const pythonParser_1 = require("./pythonParser");
const typescriptParser_1 = require("./typescriptParser");
class CodeParser {
    constructor(parsers) {
        this.parsers = parsers ?? [
            new typescriptParser_1.TypeScriptParser(),
            new pythonParser_1.PythonParser(),
            new javaLikeParser_1.JavaLikeParser()
        ];
    }
    parse(content, filePath = 'inline.ts') {
        const extension = path.extname(filePath).toLowerCase();
        const parser = this.parsers.find(candidate => candidate.supports(extension)) ?? this.parsers[0];
        return parser.parse(content, filePath);
    }
}
exports.CodeParser = CodeParser;
//# sourceMappingURL=codeParser.js.map
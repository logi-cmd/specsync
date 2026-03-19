import * as path from 'path';
import { JavaLikeParser } from './javaLikeParser';
import { PythonParser } from './pythonParser';
import { TypeScriptParser } from './typescriptParser';

export interface CodeField {
    name: string;
    type: string;
    optional?: boolean;
}

export interface CodeDecoratorMeta {
    name: string;
    arguments: string[];
}

export interface CodeValidation {
    fieldName?: string;
    kind: 'required' | 'length' | 'pattern' | 'range' | 'enum' | 'custom';
    source: 'decorator' | 'ast' | 'annotation' | 'comment';
    functionName?: string;
    min?: number;
    max?: number;
    pattern?: string;
    values?: string[];
    evidence: string;
}

export interface CodeRule {
    description: string;
    source: 'decorator' | 'annotation' | 'comment';
    functionName?: string;
    evidence: string;
}

export interface CodeApiBinding {
    functionName: string;
    method?: string;
    path?: string;
    source: 'decorator' | 'annotation' | 'naming';
    evidence: string;
}

export interface CodeFunction {
    name: string;
    params: CodeField[];
    returnType?: string;
    comments: string[];
    decorators: CodeDecoratorMeta[];
}

export interface CodeInterface {
    name: string;
    fields: CodeField[];
}

export interface CodeDocument {
    language: string;
    interfaces: CodeInterface[];
    functions: CodeFunction[];
    comments: string[];
    validations: CodeValidation[];
    rules: CodeRule[];
    apiBindings: CodeApiBinding[];
}

export interface LanguageParser {
    readonly language: string;
    supports(extension: string): boolean;
    parse(content: string, filePath?: string): CodeDocument;
}

export class CodeParser {
    private readonly parsers: LanguageParser[];

    constructor(parsers?: LanguageParser[]) {
        this.parsers = parsers ?? [
            new TypeScriptParser(),
            new PythonParser(),
            new JavaLikeParser()
        ];
    }

    parse(content: string, filePath = 'inline.ts'): CodeDocument {
        const extension = path.extname(filePath).toLowerCase();
        const parser = this.parsers.find(candidate => candidate.supports(extension)) ?? this.parsers[0];
        return parser.parse(content, filePath);
    }
}

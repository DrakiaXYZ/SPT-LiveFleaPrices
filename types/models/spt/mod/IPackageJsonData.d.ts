export interface IPackageJsonData {
    incompatibilities?: string[];
    dependencies?: Record<string, string>;
    modDependencies?: Record<string, string>;
    name: string;
    author: string;
    version: string;
    akiVersion: string;
    /** We deliberately purge this data */
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
    licence: string;
    main: string;
    isBundleMod: boolean;
    contributors: string[];
}

﻿import "reflect-metadata";
import { IInjector, IInjectorModule, InjectableMetadataKey } from "../injection";
import { inject, injectable, Container, decorate, interfaces, METADATA_KEY } from "inversify";

export class InversifyInjector implements IInjector {
    private conatainer: Container;

    constructor() {
        this.bindSingleton = this.bindSingleton.bind(this);
        this.bind = this.bind.bind(this);

        this.conatainer = new Container();
    }

    public getFunctionArguments(func: Function): string[] {
        if (!func) {
            throw new Error(`Parameter "func" cannot be empty`);
        }

        if (typeof func !== "function") {
            throw new Error(`Parameter "func" is not a function.`);
        }

        const signature = func.toString();
        const classMatches = signature.match(/(constructor\s*\(([^\(\)]*)\))/);

        if (classMatches && classMatches.length >= 1) {
            const args = classMatches[2];
            return args.split(",").map((arg) => arg.replace(/\/\*.*\*\//, "").trim()).filter((arg) => arg);
        }

        const functionMatches = signature.match(/^function.*?\(([^\(\)]*)\)/);

        if (functionMatches && functionMatches.length >= 1) {
            const args = functionMatches[1];
            return args.split(",").map((arg) => arg.replace(/\/\*.*\*\//, "").trim()).filter((arg) => arg);
        }

        return [];
    }

    private decorateComponent(name: string, component: any): void {
        if (Reflect.hasOwnMetadata(METADATA_KEY.PARAM_TYPES, component)) {
            return;
        }

        try {
            decorate(injectable(), component);
            Reflect.defineMetadata(InjectableMetadataKey, { name: name }, component);
        }
        catch (error) {
            console.warn(`Unable to decorate component "${name}". ${error}`);
        }

        const constructorArguments = this.getFunctionArguments(component);

        for (let i = 0; i < constructorArguments.length; i++) {
            try {
                decorate(inject(constructorArguments[i]), component, i);
            }
            catch (error) {
                console.warn(`Unable to decorate constructor argument "${constructorArguments[i]}" for component "${name}". ${error}`);
            }
        }
    }

    private bindInternal<T>(name: string, component: any): interfaces.BindingInWhenOnSyntax<T> {
        if (this.conatainer.isBound(name)) {
            this.conatainer.unbind(name);
        }

        this.decorateComponent(name, component);

        return this.conatainer.bind<T>(name).to(component);
    }

    public bind(name: string, component: any): void {
        this.bindInternal(name, component);
    }

    public bindSingleton(name: string, singletone: any): void {
        this.bindInternal(name, singletone).inSingletonScope();
    }

    public bindFactory<T>(name: string, factory: (ctx: IInjector) => T): void {
        let injector = this;

        const construct: any = function () {
            return factory(injector);
        }
        this.bindInternal(name, construct);
    }

    public bindSingletonFactory<T>(name: string, factory: (ctx: IInjector) => T): void {
        const injector = this;

        const construct: any = function () {
            return factory(injector);
        }
        this.bindInternal(name, construct).inSingletonScope(); // TODO: Read how to bind factory
    }

    public bindInstance<T>(name: string, instance: T): void {
        if (this.conatainer.isBound(name)) {
            this.conatainer.unbind(name);
        }

        this.conatainer.bind(name).toConstantValue(instance);
    }

    public resolve<TImplementationType>(runtimeIdentifier: string): TImplementationType {
        const component = this.conatainer.get<TImplementationType>(runtimeIdentifier);

        if (!component) {
            throw new Error(`Component ${runtimeIdentifier} not found.`);
        }

        return component;
    }

    public bindModule(module: IInjectorModule): void {
        module.register(this);
    }

    /**
     * Declares a collection of dependencies.
     * @param collectionName
     */
    public bindCollection(collectionName: string): void {
        const kernel = this.conatainer;
        const result = [];

        @injectable()
        class Placeholder { }

        @injectable()
        class Collection {
            constructor() {
                try {
                    const collection = kernel.getAll(collectionName + "C");

                    result.push(...collection.slice(1));
                }
                catch (error) {
                    throw new Error(`Unable to resolve collection "${collectionName}": ${error}`);
                }

                return result;
            }
        }
        this.conatainer.bind<any>(collectionName).to(Collection).inSingletonScope();
        this.conatainer.bind<any>(collectionName + "C").to(Placeholder);
    }

    /**
     * Declares a collection of dependencies that may contain with circular references.
     * @param collectionName 
     */
    public bindCollectionLazily(collectionName: string): void {
        const kernel = this.conatainer;
        const result = [];

        @injectable()
        class Placeholder { }

        @injectable()
        class Collection {
            constructor() {
                setImmediate(() => {
                    try {
                        const collection = kernel.getAll(collectionName + "C");

                        result.push(...collection.slice(1));
                    }
                    catch (error) {
                        throw new Error(`Unable to resolve collection "${collectionName}": ${error}`);
                    }
                });

                return result;
            }
        }
        this.conatainer.bind<any>(collectionName).to(Collection).inSingletonScope();
        this.conatainer.bind<any>(collectionName + "C").to(Placeholder);
    }

    public bindToCollection(collectionName: string, component: any, name?: string): void {
        this.decorateComponent(collectionName + "C", component);
        this.conatainer.bind<any>(collectionName + "C").to(component);

        if (name) {
            this.conatainer.bind<any>(name).to(component);
        }
    }

    public bindInstanceToCollection(collectionName: string, instance: any, name?: string): void {
        this.conatainer.bind<any>(collectionName + "C").toConstantValue(instance);

        if (name) {
            this.conatainer.bind<any>(name).toConstantValue(instance);
        }
    }
}
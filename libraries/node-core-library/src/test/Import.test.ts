// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as nodeJsPath from 'path';
import { Import } from '../Import';
import { PackageJsonLookup } from '../PackageJsonLookup';
import { Path } from '../Path';

describe(Import.name, () => {
  const packageRoot: string = PackageJsonLookup.instance.tryGetPackageFolderFor(__dirname)!;

  function expectToThrowNormalizedErrorMatchingSnapshot(fn: () => void): void {
    try {
      fn();
      fail('Expected an error to be thrown');
    } catch (error) {
      const normalizedErrorMessage: string = error.message
        .replace(packageRoot, '<packageRoot>')
        .replace(__dirname, '<dirname>')
        .replace(/\\/g, '/');
      expect(normalizedErrorMessage).toMatchSnapshot();
    }
  }

  describe(Import.resolveModule.name, () => {
    it('returns an absolute path as-is', () => {
      const absolutePaths: string[] = ['/var/test/path'];

      for (const absolutePath of absolutePaths) {
        expect(Import.resolveModule({ modulePath: absolutePath, baseFolderPath: __dirname })).toEqual(
          absolutePath
        );
      }
    });

    it('resolves a relative path', () => {
      expect(Import.resolveModule({ modulePath: './baz', baseFolderPath: __dirname })).toEqual(
        nodeJsPath.join(__dirname, 'baz')
      );
      expect(Import.resolveModule({ modulePath: '../baz', baseFolderPath: __dirname })).toEqual(
        nodeJsPath.resolve(__dirname, '..', 'baz')
      );
      expect(Import.resolveModule({ modulePath: './baz/ban', baseFolderPath: __dirname })).toEqual(
        nodeJsPath.join(__dirname, 'baz', 'ban')
      );
      expect(Import.resolveModule({ modulePath: '../baz/ban', baseFolderPath: __dirname })).toEqual(
        nodeJsPath.resolve(__dirname, '..', 'baz', 'ban')
      );
    });

    it('resolves a dependency', () => {
      expect(
        Path.convertToSlashes(
          Import.resolveModule({ modulePath: '@rushstack/heft', baseFolderPath: __dirname })
        )
      ).toMatch(/node_modules\/@rushstack\/heft\/lib\/index.js$/);
    });

    it('resolves a path inside a dependency', () => {
      expect(
        Path.convertToSlashes(
          Import.resolveModule({
            modulePath: '@rushstack/heft/lib/start.js',
            baseFolderPath: __dirname
          })
        )
      ).toMatch(/node_modules\/@rushstack\/heft\/lib\/start\.js$/);
    });

    it('resolves a dependency of a dependency', () => {
      expect(
        Path.convertToSlashes(
          Import.resolveModule({
            modulePath: '@rushstack/ts-command-line',
            baseFolderPath: nodeJsPath.join(packageRoot, 'node_modules', '@rushstack', 'heft')
          })
        )
      ).toMatch(/node_modules\/@rushstack\/ts-command-line\/lib\/index\.js$/);
    });

    it('resolves a path inside a dependency of a dependency', () => {
      expect(
        Path.convertToSlashes(
          Import.resolveModule({
            modulePath: '@rushstack/ts-command-line/lib/Constants.js',
            baseFolderPath: nodeJsPath.join(packageRoot, 'node_modules', '@rushstack', 'heft')
          })
        )
      ).toMatch(/node_modules\/@rushstack\/ts-command-line\/lib\/Constants\.js$/);
    });

    describe('allowSelfReference', () => {
      it('resolves a path inside this package with allowSelfReference turned on', () => {
        expect(
          Import.resolveModule({
            modulePath: '@rushstack/node-core-library',
            baseFolderPath: __dirname,
            allowSelfReference: true
          })
        ).toEqual(packageRoot);
        expect(
          Import.resolveModule({
            modulePath: '@rushstack/node-core-library/lib/Constants.js',
            baseFolderPath: __dirname,
            allowSelfReference: true
          })
        ).toEqual(nodeJsPath.join(packageRoot, 'lib', 'Constants.js'));
      });

      it('throws on an attempt to reference this package without allowSelfReference turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolveModule({
            modulePath: '@rushstack/node-core-library',
            baseFolderPath: __dirname
          })
        );
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolveModule({
            modulePath: '@rushstack/node-core-library/lib/Constants.js',
            baseFolderPath: __dirname
          })
        );
      });
    });

    describe('includeSystemModules', () => {
      it('resolves a system module with includeSystemModules turned on', () => {
        expect(
          Import.resolveModule({ modulePath: 'http', baseFolderPath: __dirname, includeSystemModules: true })
        ).toEqual('http');
      });

      it('throws on an attempt to resolve a system module without includeSystemModules turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolveModule({ modulePath: 'http', baseFolderPath: __dirname })
        );
      });

      it('throws on an attempt to resolve a path inside a system module with includeSystemModules turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolveModule({
            modulePath: 'http/foo/bar',
            baseFolderPath: __dirname,
            includeSystemModules: true
          })
        );
      });
    });
  });

  describe(Import.resolvePackage.name, () => {
    it('resolves a dependency', () => {
      expect(
        Import.resolvePackage({ packageName: '@rushstack/heft', baseFolderPath: __dirname }).replace(
          /\\/g,
          '/'
        )
      ).toMatch(/node_modules\/@rushstack\/heft$/);
    });

    it('fails to resolve a path inside a dependency', () => {
      expectToThrowNormalizedErrorMatchingSnapshot(() =>
        Path.convertToSlashes(
          Import.resolvePackage({
            packageName: '@rushstack/heft/lib/start.js',
            baseFolderPath: __dirname
          })
        )
      );
    });

    it('resolves a dependency of a dependency', () => {
      expect(
        Path.convertToSlashes(
          Import.resolvePackage({
            packageName: '@rushstack/ts-command-line',
            baseFolderPath: nodeJsPath.join(packageRoot, 'node_modules', '@rushstack', 'heft')
          })
        )
      ).toMatch(/node_modules\/@rushstack\/ts-command-line$/);
    });

    it('fails to resolve a path inside a dependency of a dependency', () => {
      expectToThrowNormalizedErrorMatchingSnapshot(() =>
        Path.convertToSlashes(
          Import.resolvePackage({
            packageName: '@rushstack/ts-command-line/lib/Constants.js',
            baseFolderPath: nodeJsPath.join(packageRoot, 'node_modules', '@rushstack', 'heft')
          })
        )
      );
    });

    describe('allowSelfReference', () => {
      it('resolves this package with allowSelfReference turned on', () => {
        expect(
          Import.resolvePackage({
            packageName: '@rushstack/node-core-library',
            baseFolderPath: __dirname,
            allowSelfReference: true
          })
        ).toEqual(packageRoot);
      });

      it('fails to resolve a path inside this package with allowSelfReference turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolvePackage({
            packageName: '@rushstack/node-core-library/lib/Constants.js',
            baseFolderPath: __dirname,
            allowSelfReference: true
          })
        );
      });

      it('throws on an attempt to reference this package without allowSelfReference turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolvePackage({
            packageName: '@rushstack/node-core-library',
            baseFolderPath: __dirname
          })
        );
      });
    });

    describe('includeSystemModules', () => {
      it('resolves a system module with includeSystemModules turned on', () => {
        expect(
          Import.resolvePackage({
            packageName: 'http',
            baseFolderPath: __dirname,
            includeSystemModules: true
          })
        ).toEqual('http');
      });

      it('throws on an attempt to resolve a system module without includeSystemModules turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolvePackage({ packageName: 'http', baseFolderPath: __dirname })
        );
      });

      it('throws on an attempt to resolve a path inside a system module with includeSystemModules turned on', () => {
        expectToThrowNormalizedErrorMatchingSnapshot(() =>
          Import.resolvePackage({
            packageName: 'http/foo/bar',
            baseFolderPath: __dirname,
            includeSystemModules: true
          })
        );
      });
    });
  });
});

import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { parseVless } from '../src/parsers/protocols/vlessParser.js';
import { parseTrojan } from '../src/parsers/protocols/trojanParser.js';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';

describe('REALITY support-x25519mlkem768 and fingerprint handling', () => {
    describe('VLESS REALITY parsing and Clash building', () => {
        it('should default support-x25519mlkem768 to true when omitted in REALITY URL', async () => {
            const url = 'vless://test-uuid@example.com:443?security=reality&sni=example.com&pbk=testkey&sid=testsid#TestDefault';
            const parsed = parseVless(url);

            expect(parsed.tls.reality.support_x25519mlkem768).toBe(true);
            expect(parsed.tls.utls.fingerprint).toBe('chrome');

            const builder = new ClashConfigBuilder(url, 'minimal', [], null, 'zh-CN', 'clash.meta');
            const config = await builder.build();
            const doc = yaml.load(config);
            const proxy = doc.proxies.find(p => p.name === 'TestDefault');

            expect(proxy['reality-opts']['support-x25519mlkem768']).toBe(true);
            expect(proxy['reality-opts']['public-key']).toBe('testkey');
            expect(proxy['reality-opts']['short-id']).toBe('testsid');
        });

        it('should support explicit mlkem=0 / false in REALITY URL', async () => {
            const url = 'vless://test-uuid@example.com:443?security=reality&sni=example.com&pbk=testkey&sid=testsid&mlkem=0#TestFalse';
            const parsed = parseVless(url);

            expect(parsed.tls.reality.support_x25519mlkem768).toBe(false);

            const builder = new ClashConfigBuilder(url, 'minimal', [], null, 'zh-CN', 'clash.meta');
            const config = await builder.build();
            const doc = yaml.load(config);
            const proxy = doc.proxies.find(p => p.name === 'TestFalse');

            expect(proxy['reality-opts']['support-x25519mlkem768']).toBe(false);
        });

        it('should support explicit support-x25519mlkem768=1 / true in REALITY URL', async () => {
            const url = 'vless://test-uuid@example.com:443?security=reality&sni=example.com&pbk=testkey&sid=testsid&support-x25519mlkem768=true#TestTrue';
            const parsed = parseVless(url);

            expect(parsed.tls.reality.support_x25519mlkem768).toBe(true);

            const builder = new ClashConfigBuilder(url, 'minimal', [], null, 'zh-CN', 'clash.meta');
            const config = await builder.build();
            const doc = yaml.load(config);
            const proxy = doc.proxies.find(p => p.name === 'TestTrue');

            expect(proxy['reality-opts']['support-x25519mlkem768']).toBe(true);
        });

        it('should respect custom fp parameter in VLESS REALITY URL', () => {
            const url = 'vless://test-uuid@example.com:443?security=reality&sni=example.com&pbk=testkey&sid=testsid&fp=safari#TestFp';
            const parsed = parseVless(url);

            expect(parsed.tls.utls.fingerprint).toBe('safari');
        });
    });

    describe('Trojan REALITY parsing and Clash building', () => {
        it('should default support-x25519mlkem768 to true for Trojan REALITY', async () => {
            const url = 'trojan://test-pwd@example.com:443?security=reality&sni=example.com&pbk=testkey&sid=testsid#TestTrojan';
            const parsed = parseTrojan(url);

            expect(parsed.tls.reality.support_x25519mlkem768).toBe(true);
            expect(parsed.tls.utls.fingerprint).toBe('chrome');

            const builder = new ClashConfigBuilder(url, 'minimal', [], null, 'zh-CN', 'clash.meta');
            const config = await builder.build();
            const doc = yaml.load(config);
            const proxy = doc.proxies.find(p => p.name === 'TestTrojan');

            expect(proxy['reality-opts']['support-x25519mlkem768']).toBe(true);
        });
    });

    describe('convertYamlProxyToObject', () => {
        it('should preserve and parse support-x25519mlkem768 from Clash YAML proxy', () => {
            const yamlProxy = {
                name: 'ClashReality',
                type: 'vless',
                server: 'example.com',
                port: 443,
                uuid: 'test-uuid',
                tls: true,
                'reality-opts': {
                    'public-key': 'testkey',
                    'short-id': 'testsid',
                    'support-x25519mlkem768': false
                }
            };

            const obj = convertYamlProxyToObject(yamlProxy);
            expect(obj.tls.reality.support_x25519mlkem768).toBe(false);
        });

        it('should default support-x25519mlkem768 to true if not specified in Clash YAML proxy', () => {
            const yamlProxy = {
                name: 'ClashRealityDefault',
                type: 'vless',
                server: 'example.com',
                port: 443,
                uuid: 'test-uuid',
                tls: true,
                'reality-opts': {
                    'public-key': 'testkey',
                    'short-id': 'testsid'
                }
            };

            const obj = convertYamlProxyToObject(yamlProxy);
            expect(obj.tls.reality.support_x25519mlkem768).toBe(true);
        });
    });
});

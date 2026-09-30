import { describe, it, expect } from 'vitest';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';
import { SING_BOX_CONFIG, SING_BOX_CONFIG_V1_11 } from '../src/config/singboxConfig.js';
import { createApp } from '../src/app/createApp.jsx';

const sampleInput = JSON.stringify({
    outbounds: [
        {
            type: 'vless',
            tag: 'test-proxy',
            server: 'example.com',
            server_port: 443,
            uuid: '00000000-0000-0000-0000-000000000000',
            tls: { enabled: true, server_name: 'example.com' }
        }
    ]
});

describe('sing-box 1.14+ compatibility: DNS fakeip migration', () => {
    it('SING_BOX_CONFIG (1.12+) should not contain dns.fakeip', () => {
        expect(SING_BOX_CONFIG.dns).not.toHaveProperty('fakeip');
    });

    it('SingboxConfigBuilder for 1.14 should remove dns.fakeip even if baseConfig contains it', async () => {
        const baseWithLegacyFakeip = {
            ...SING_BOX_CONFIG_V1_11,
            dns: {
                ...SING_BOX_CONFIG_V1_11.dns,
                fakeip: {
                    enabled: true,
                    inet4_range: '198.18.0.0/15',
                    inet6_range: 'fc00::/18'
                }
            }
        };

        const builder = new SingboxConfigBuilder(
            sampleInput, [], [], baseWithLegacyFakeip, 'zh-CN', null,
            false, false, null, null, '1.14'
        );
        const result = await builder.build();

        expect(result.dns).not.toHaveProperty('fakeip');
        const fakeipServer = result.dns?.servers?.find(s => s.type === 'fakeip' || s.tag === 'dns_fakeip');
        expect(fakeipServer).toBeDefined();
        expect(fakeipServer.type).toBe('fakeip');
        expect(fakeipServer).not.toHaveProperty('address');
        expect(fakeipServer.inet4_range).toBe('198.18.0.0/15');
    });

    it('SingboxConfigBuilder for 1.12 should remove dns.fakeip if upstream subscription injects it', async () => {
        const upstreamWithFakeip = JSON.stringify({
            dns: {
                fakeip: {
                    enabled: true,
                    inet4_range: '198.18.0.0/15'
                }
            },
            outbounds: [
                {
                    type: 'vless',
                    tag: 'node-1',
                    server: '1.1.1.1',
                    server_port: 443,
                    uuid: '00000000-0000-0000-0000-000000000000'
                }
            ]
        });

        const builder = new SingboxConfigBuilder(
            upstreamWithFakeip, [], [], null, 'zh-CN', null,
            false, false, null, null, '1.12'
        );
        const result = await builder.build();

        expect(result.dns).not.toHaveProperty('fakeip');
        const fakeipServer = result.dns?.servers?.find(s => s.type === 'fakeip');
        expect(fakeipServer).toBeDefined();
    });

    it('SingboxConfigBuilder for 1.11 (legacy) should preserve legacy format when explicitly targeting 1.11', async () => {
        const builder = new SingboxConfigBuilder(
            sampleInput, [], [], SING_BOX_CONFIG_V1_11, 'zh-CN', null,
            false, false, null, null, '1.11'
        );
        const result = await builder.build();

        expect(result.dns).toHaveProperty('fakeip');
    });

    it('createApp /singbox endpoint never outputs legacy dns.fakeip for default or modern queries', async () => {
        const app = createApp();
        const config = 'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';

        for (const query of ['', '&singbox_version=latest', '&singbox_version=1.14', '&singbox_version=1.12']) {
            const res = await app.request(`http://localhost/singbox?config=${encodeURIComponent(config)}${query}`);
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.dns).not.toHaveProperty('fakeip');
            const fakeipServer = json.dns?.servers?.find(s => s.type === 'fakeip');
            expect(fakeipServer).toBeDefined();
        }
    });
});

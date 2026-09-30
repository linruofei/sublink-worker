import { describe, it, expect } from 'vitest';
import { formLogicFn } from '../src/components/formLogic.js';

describe('formLogic toString fix', () => {
  it('includes parseSurgeConfigInput definition in toString output', () => {
    const fnString = formLogicFn.toString();

    // Verify the function references parseSurgeConfigInput
    expect(fnString).toContain('parseSurgeConfigInput');

    // Verify the arrow function definitions ARE included
    expect(fnString).toMatch(/(?:const|var|let)\s+parseSurgeConfigInput\s*=/);
    expect(fnString).toMatch(/(?:const|var|let)\s+parseSurgeValue\s*=/);
    expect(fnString).toMatch(/(?:const|var|let)\s+convertSurgeIniToJson\s*=/);
  });

  it('does not contain __name calls that break in browser runtime', () => {
    const fnString = formLogicFn.toString();
    // Ensure no function declarations that esbuild would inject __name() for
    expect(fnString).not.toMatch(/^\s*function\s+parseSurgeValue\b/m);
    expect(fnString).not.toMatch(/^\s*function\s+convertSurgeIniToJson\b/m);
    expect(fnString).not.toMatch(/^\s*function\s+parseSurgeConfigInput\b/m);
  });

  it('formData() returns a valid Alpine data object', () => {
    // Simulate browser global environment using Function constructor
    const fakeWindow = { APP_TRANSLATIONS: {}, PREDEFINED_RULE_SETS: {} };
    const fn = new Function('window', '(' + formLogicFn.toString() + ')(); return window;');
    const result = fn(fakeWindow);
    const data = result.formData();
    expect(typeof data.submitForm).toBe('function');
    expect(typeof data.toggleAccordion).toBe('function');
    expect(data.showAdvanced).toBe(false);
  });

  it('submitForm generates singbox link with default singbox_version=1.14', async () => {
    const fakeWindow = {
      APP_TRANSLATIONS: {},
      PREDEFINED_RULE_SETS: {},
      location: { origin: 'https://example.com', search: '', pathname: '/', hash: '' },
      history: { replaceState: () => {} },
      setTimeout: (fn) => fn()
    };
    const fakeDocument = {
      querySelector: () => null
    };

    const fn = new Function('window', 'document', '(' + formLogicFn.toString() + ')(); return window;');
    const result = fn(fakeWindow, fakeDocument);
    const data = result.formData();
    data.input = 'vless://12345678-1234-1234-1234-123456789abc@1.1.1.1:443#Test';
    data.selectedRules = ['minimal'];

    await data.submitForm();

    expect(data.generatedLinks).toBeDefined();
    const singboxUrl = new URL(data.generatedLinks.singbox);
    expect(singboxUrl.searchParams.get('singbox_version')).toBe('1.14');

    const clashUrl = new URL(data.generatedLinks.clash);
    expect(clashUrl.searchParams.get('singbox_version')).toBeNull();
  });
});

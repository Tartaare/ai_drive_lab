const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'src', 'ts', 'world', 'ProceduralTrack.ts');

const UI_RANGES = {
    numControlPoints: { min: 6, mid: 13, max: 20, integer: true },
    baseRadius: { min: 30, mid: 90, max: 150, integer: true },
    radiusVariation: { min: 0, mid: 0.5, max: 1, integer: false },
    angleVariation: { min: 0, mid: 0.5, max: 1, integer: false },
    trackWidth: { min: 5, mid: 17, max: 30, integer: true }
};

function loadTrackModule() {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2017
        }
    }).outputText;

    const mod = { exports: {} };
    const compiled = new Function('require', 'exports', 'module', output);
    compiled(require, mod.exports, mod);
    return mod.exports;
}

function withMutedTrackLogs(callback) {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = function noop() {};
    console.warn = function noop() {};
    console.error = function noop() {};

    try {
        return callback();
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function measuredWidth(trackData, index) {
    return trackData.leftBorder[index].distanceTo(trackData.rightBorder[index]);
}

function expectedMinRadius(config) {
    return Math.max(3.5, config.trackWidth * 0.55);
}

function expectedMinClearance(config) {
    return config.trackWidth * 1.7;
}

function validateGeneratedTrack(testCase, trackData) {
    const label = `${testCase.group}/${testCase.name}`;
    const report = trackData.qaReport;

    assert(report && report.accepted, `${label}: generation fell back or was rejected`);
    assert(trackData.centerPoints.length > 0, `${label}: empty centerline`);
    assert(trackData.leftBorder.length === trackData.centerPoints.length, `${label}: left border length mismatch`);
    assert(trackData.rightBorder.length === trackData.centerPoints.length, `${label}: right border length mismatch`);
    assert(trackData.startLineIndex === 0, `${label}: start line was not normalized to index 0`);
    assert(report.minRadius >= expectedMinRadius(testCase.config), `${label}: min radius ${report.minRadius.toFixed(2)}m is below policy`);
    assert(report.minTrackClearance >= expectedMinClearance(testCase.config), `${label}: clearance ${report.minTrackClearance.toFixed(2)}m is below policy`);

    const sampleIndexes = [
        0,
        Math.floor(trackData.centerPoints.length * 0.25),
        Math.floor(trackData.centerPoints.length * 0.5),
        Math.floor(trackData.centerPoints.length * 0.75)
    ];

    for (const index of sampleIndexes) {
        const width = measuredWidth(trackData, index);
        const minWidth = testCase.config.trackWidth * 0.93;
        const maxWidth = testCase.config.trackWidth * 1.07;
        assert(width >= minWidth && width <= maxWidth, `${label}: width ${width.toFixed(2)}m out of range at index ${index}`);
    }
}

function boundaryCases(defaultTrackConfig) {
    const keys = Object.keys(UI_RANGES);
    const cases = [];
    const valueSets = keys.map(function valuesForKey(key) {
        const range = UI_RANGES[key];
        return [range.min, range.mid, range.max];
    });

    function visit(index, partial) {
        if (index === keys.length) {
            cases.push({
                group: 'boundary-grid',
                name: `case-${String(cases.length + 1).padStart(3, '0')}`,
                config: {
                    ...defaultTrackConfig,
                    ...partial,
                    difficulty: 'moyen',
                    seed: 9000 + cases.length
                }
            });
            return;
        }

        const key = keys[index];
        for (const value of valueSets[index]) {
            visit(index + 1, { ...partial, [key]: value });
        }
    }

    visit(0, {});
    return cases;
}

function presetCases(defaultTrackConfig) {
    return [
        {
            group: 'preset',
            name: 'default-medium',
            config: { ...defaultTrackConfig, difficulty: 'moyen', seed: 4242 }
        },
        {
            group: 'preset',
            name: 'facile',
            config: {
                numControlPoints: 8,
                baseRadius: 50,
                radiusVariation: 0.15,
                angleVariation: 0.1,
                trackWidth: 14,
                sampleCount: 250,
                difficulty: 'facile',
                seed: 4242
            }
        },
        {
            group: 'preset',
            name: 'vraiment-difficile',
            config: {
                numControlPoints: 16,
                baseRadius: 110,
                radiusVariation: 0.6,
                angleVariation: 0.55,
                trackWidth: 6.5,
                sampleCount: 250,
                difficulty: 'vraiment_difficile',
                seed: 4242
            }
        }
    ];
}

function makeRandom(seed) {
    let state = seed >>> 0;
    return function next() {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function randomInRange(random, range) {
    const raw = range.min + random() * (range.max - range.min);
    if (range.integer) {
        return Math.round(raw);
    }
    return Math.round(raw * 100) / 100;
}

function fuzzCases(defaultTrackConfig, count) {
    const random = makeRandom(0xA9E5);
    const keys = Object.keys(UI_RANGES);
    const cases = [];

    for (let i = 0; i < count; i++) {
        const config = { ...defaultTrackConfig, difficulty: 'moyen', seed: 12000 + i };
        for (const key of keys) {
            config[key] = randomInRange(random, UI_RANGES[key]);
        }
        cases.push({
            group: 'seeded-fuzz',
            name: `case-${String(i + 1).padStart(3, '0')}`,
            config
        });
    }

    return cases;
}

function maxSettingSeedCases(defaultTrackConfig, count) {
    const random = makeRandom(123456789);
    const cases = [];

    for (let i = 0; i < count; i++) {
        cases.push({
            group: 'max-settings-seeds',
            name: `case-${String(i + 1).padStart(3, '0')}`,
            config: {
                ...defaultTrackConfig,
                numControlPoints: UI_RANGES.numControlPoints.max,
                baseRadius: UI_RANGES.baseRadius.max,
                radiusVariation: UI_RANGES.radiusVariation.max,
                angleVariation: UI_RANGES.angleVariation.max,
                trackWidth: UI_RANGES.trackWidth.max,
                difficulty: 'moyen',
                seed: Math.floor(random() * 1000000)
            }
        });
    }

    return cases;
}

function summarize(results) {
    const groups = {};
    for (const result of results) {
        if (!groups[result.group]) {
            groups[result.group] = { count: 0, minRadius: Infinity, minClearance: Infinity };
        }
        groups[result.group].count++;
        groups[result.group].minRadius = Math.min(groups[result.group].minRadius, result.minRadius);
        groups[result.group].minClearance = Math.min(groups[result.group].minClearance, result.minClearance);
    }

    for (const group of Object.keys(groups)) {
        const item = groups[group];
        console.log(
            `PASS ${group}: cases=${item.count}, minRadius=${item.minRadius.toFixed(2)}m, minClearance=${item.minClearance.toFixed(2)}m`
        );
    }
}

function run() {
    const { generateTrack, defaultTrackConfig } = loadTrackModule();
    const cases = [
        ...presetCases(defaultTrackConfig),
        ...boundaryCases(defaultTrackConfig),
        ...fuzzCases(defaultTrackConfig, 80),
        ...maxSettingSeedCases(defaultTrackConfig, 80)
    ];

    const results = withMutedTrackLogs(function executeCases() {
        return cases.map(function runCase(testCase) {
            const trackData = generateTrack(testCase.config);
            validateGeneratedTrack(testCase, trackData);
            return {
                group: testCase.group,
                minRadius: trackData.qaReport.minRadius,
                minClearance: trackData.qaReport.minTrackClearance
            };
        });
    });

    summarize(results);
    console.log(`PASS total: cases=${results.length}`);
}

try {
    run();
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
}

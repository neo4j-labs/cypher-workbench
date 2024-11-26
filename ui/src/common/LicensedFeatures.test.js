
import { setLicensedFeatures, anyFeatureLicensed } from './LicensedFeatures';

test('any feature licensed', () => {
    setLicensedFeatures(['A','B','C']);
    expect(anyFeatureLicensed(['A'])).toBe(true);
    expect(anyFeatureLicensed(['C','E'])).toBe(true);
    expect(anyFeatureLicensed(['D','E'])).toBe(false);
});

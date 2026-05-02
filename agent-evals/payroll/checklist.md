# Confidential Payroll — Eval Checklist

## Contract (12 items)

- [ ] Contract extends SepoliaConfig
- [ ] Admin-only functions with onlyOwner modifier
- [ ] Encrypted salary mapping: mapping(address => euint32)
- [ ] setSalary takes externalEuint32 + bytes inputProof
- [ ] FHE.fromExternal with proof validation
- [ ] FHE.allowThis on stored encrypted salaries
- [ ] FHE.allow for employee to decrypt their own salary
- [ ] claimSalary function with ACL verification
- [ ] Per-period tracking (claim resets per period)
- [ ] addEmployee/removeEmployee admin functions
- [ ] getSalary returns encrypted handle
- [ ] No encrypted values in require conditions

## Tests (8 items)

- [ ] fhevmjs instance setup in beforeEach
- [ ] Admin can set encrypted salary for employee
- [ ] Employee can decrypt their own salary
- [ ] Other employees cannot see each other's salaries
- [ ] Claiming salary marks it as claimed
- [ ] Double-claim prevention
- [ ] Admin can add and remove employees
- [ ] Invalid proof rejected

## Frontend (5 items)

- [ ] Employer UI to set encrypted salaries
- [ ] Employee UI to view and decrypt their salary
- [ ] Claim button with encrypted input generation
- [ ] DecryptButton for salary display
- [ ] Wallet connection with FHE instance

## Linter (3 items)

- [ ] fhevm:lint passes with 0 errors
- [ ] No missing FHE.allowThis warnings
- [ ] No encrypted-in-require errors

## Build (3 items)

- [ ] npm run compile succeeds
- [ ] npm run test passes
- [ ] Deploy script works

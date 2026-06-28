# Performance Testing Suite

This directory contains Artillery load testing scripts to validate the API performance under various scenarios.

## Scenarios Included

1. **Load Test** (`load_test.yml`): Simulates sustained traffic (50 concurrent users) to ensure the system can handle nominal load without degrading.
2. **Stress Test** (`stress_test.yml`): Pushes the system to its limits (up to 300+ concurrent users) to find the breaking point and observe how it fails (e.g. rate limit, connection timeouts).
3. **Spike Test** (`spike_test.yml`): Tests how the system handles sudden bursts of traffic (from 0 to 500 users instantly) to validate concurrency limits.
4. **DAU Simulation Test** (`dau_test.yml`): A long-duration test simulating daily active user (DAU) patterns (gradual ramp up, sustained plateau, gradual scale down).
5. **Regression Test** (`regression_test.yml`): A quick, low-intensity test to establish a baseline and ensure no major performance regressions were introduced in the latest deployment.

## Prerequisites

1. Install Artillery globally or run via `npx`:
   ```bash
   npm install -g artillery
   ```

2. Export a valid JWT token for an authenticated user:
   ```bash
   export TOKEN="your_valid_jwt_token_here"
   ```
   *Tip: You can use the `seed-test-user.ts` script in the backend to generate a valid token.*

3. Set the target environment (Optional). The scripts default to `http://127.0.0.1:3001` (local). To test production, you can override the target via CLI:
   ```bash
   npx artillery run --environment production load_test.yml
   ```
   *Note: Add environments to the `.yml` files if you want to switch easily.*

## Running the Tests

**Run Load Test**
```bash
npx artillery run load_test.yml -o reports/load_report.json
```

**Run Stress Test**
```bash
npx artillery run stress_test.yml -o reports/stress_report.json
```

**Run Spike Test**
```bash
npx artillery run spike_test.yml -o reports/spike_report.json
```

**Run DAU Test**
```bash
npx artillery run dau_test.yml -o reports/dau_report.json
```

**Run Regression Test**
```bash
npx artillery run regression_test.yml -o reports/regression_report.json
```

## Viewing Reports

You can generate a human-readable HTML report from the output JSON using the `artillery report` command:
```bash
npx artillery report reports/load_report.json
```

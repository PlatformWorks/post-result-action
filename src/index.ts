import * as core from '@actions/core';
import * as github from '@actions/github';
import axios from 'axios';

async function run(): Promise<void> {
  try {
    const status = core.getInput('status', { required: true });
    const summary = core.getInput('summary', { required: true });
    const resultRaw = core.getInput('result', { required: true });
    const callbackUrl = core.getInput('callback_url', { required: true });

    let result: any;
    try {
      result = JSON.parse(resultRaw);
    } catch (err: any) {
      core.setFailed(`Invalid JSON in 'result': ${err.message}`);
      return;
    }

    const runUrl = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`;

    const payload = {
      status,
      summary,
      runUrl,
      result,
    };

    core.info(`Posting result to ${callbackUrl}`);
    core.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const res = await axios.post(callbackUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });

        if (res.status >= 200 && res.status < 300) {
          core.info('Successfully posted result');
          return;
        } else {
          core.warning(`Unexpected response status: ${res.status}`);
        }
      } catch (err: any) {
        const message = err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message;
        core.warning(`Attempt ${attempt + 1} failed: ${message}`);
      }

      attempt++;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }

    core.error('Failed to post result after multiple attempts');
    core.setFailed('Result dispatch failed');
  } catch (err: any) {
    core.setFailed(err.message);
  }
}

run();

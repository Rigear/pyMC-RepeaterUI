import { BaseCommand, type CommandContext } from './BaseCommand';
import ApiService from '@/utils/api';

export class StatusCommand extends BaseCommand {
  name = 'status';
  description = 'Show repeater status';
  aliases = ['st'];

  async execute({ term, writePrompt }: CommandContext): Promise<void> {
    const stopLoading = this.startLoading(term, 'Fetching status...');

    try {
      const response = await ApiService.get('/stats');
      stopLoading();

      // Handle both wrapped response and direct data
      const data = response.success && response.data ? response.data : response;

      if (data && typeof data === 'object') {
        this.writeSuccess(term, 'Repeater Status:');
        term.writeln('');
        for (const [key, value] of Object.entries(data)) {
          term.writeln(`  \x1b[36m${key.padEnd(20)}\x1b[0m ${value}`);
        }
      } else {
        this.writeError(term, 'No status data available');
      }
    } catch (error) {
      stopLoading();
      this.writeError(term, error instanceof Error ? error.message : 'Failed to fetch status');
    }

    writePrompt();
  }
}

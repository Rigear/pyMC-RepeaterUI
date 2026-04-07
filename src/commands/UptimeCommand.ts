import { BaseCommand, type CommandContext } from './BaseCommand';
import ApiService from '@/utils/api';

export class UptimeCommand extends BaseCommand {
  name = 'uptime';
  description = 'Show system uptime';

  async execute({ term, writePrompt }: CommandContext): Promise<void> {
    const stopLoading = this.startLoading(term, 'Fetching uptime...');

    try {
      const response = await ApiService.get<any>('/stats');
      stopLoading();

      const data = response.data || response;

      const seconds = data.uptime_seconds || 0;
      const uptime = this.formatUptime(seconds);

      this.writeSuccess(term, uptime);
    } catch (error) {
      stopLoading();
      this.writeError(term, `Failed to get uptime: ${error}`);
    }

    writePrompt();
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }
}

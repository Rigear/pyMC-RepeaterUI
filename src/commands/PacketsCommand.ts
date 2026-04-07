import { BaseCommand, type CommandContext } from './BaseCommand';
import ApiService from '@/utils/api';

export class PacketsCommand extends BaseCommand {
  name = 'packets';
  description = 'Show packet statistics';

  private isMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    );
  }

  async execute({ term, writePrompt }: CommandContext): Promise<void> {
    const stopLoading = this.startLoading(term, 'Fetching packet stats...');

    try {
      const response = await ApiService.get<any>('/stats');
      stopLoading();

      const data = response.data || response;

      this.writeLine(term, '');

      if (this.isMobile()) {
        // Mobile: List format
        this.writeLine(term, '  \x1b[1;36mPacket Statistics\x1b[0m');
        this.writeLine(term, '  \x1b[90mRX:\x1b[0m ' + (data.rx_count || 0));
        this.writeLine(term, '  \x1b[90mTX:\x1b[0m ' + (data.tx_count || 0));
        this.writeLine(term, '  \x1b[90mForward:\x1b[0m ' + (data.forwarded_count || 0));
        this.writeLine(term, '  \x1b[90mDropped:\x1b[0m ' + (data.dropped_count || 0));
      } else {
        // Desktop: Table format
        this.writeLine(term, '  \x1b[36m┌──────────┬──────────┐\x1b[0m');
        this.writeLine(
          term,
          '  \x1b[36m│\x1b[0m \x1b[1mMetric\x1b[0m   \x1b[36m│\x1b[0m \x1b[1mCount\x1b[0m    \x1b[36m│\x1b[0m',
        );
        this.writeLine(term, '  \x1b[36m├──────────┼──────────┤\x1b[0m');
        this.writeLine(
          term,
          `  \x1b[36m│\x1b[0m RX       \x1b[36m│\x1b[0m ${String(data.rx_count || 0).padStart(8)} \x1b[36m│\x1b[0m`,
        );
        this.writeLine(
          term,
          `  \x1b[36m│\x1b[0m TX       \x1b[36m│\x1b[0m ${String(data.tx_count || 0).padStart(8)} \x1b[36m│\x1b[0m`,
        );
        this.writeLine(
          term,
          `  \x1b[36m│\x1b[0m Forward  \x1b[36m│\x1b[0m ${String(data.forwarded_count || 0).padStart(8)} \x1b[36m│\x1b[0m`,
        );
        this.writeLine(
          term,
          `  \x1b[36m│\x1b[0m Dropped  \x1b[36m│\x1b[0m ${String(data.dropped_count || 0).padStart(8)} \x1b[36m│\x1b[0m`,
        );
        this.writeLine(term, '  \x1b[36m└──────────┴──────────┘\x1b[0m');
      }

      this.writeLine(term, '');
    } catch (error) {
      stopLoading();
      this.writeError(term, `Failed to get packet stats: ${error}`);
    }

    writePrompt();
  }
}

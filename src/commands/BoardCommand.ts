import { BaseCommand, type CommandContext } from './BaseCommand';
import ApiService from '@/utils/api';

export class BoardCommand extends BaseCommand {
  name = 'board';
  description = 'Show board information';

  async execute({ term, writePrompt }: CommandContext): Promise<void> {
    const stopLoading = this.startLoading(term, 'Fetching board info...');

    try {
      const response = await ApiService.get<any>('/stats');
      stopLoading();

      const data = response.data || response;

      // Try to get board info from stats, fallback to hardcoded
      const boardInfo = data.board_info || 'pyMC_Repeater (Linux/RPi)';

      this.writeSuccess(term, boardInfo);
    } catch (error) {
      stopLoading();
      // If stats fails, show hardcoded fallback
      this.writeSuccess(term, 'pyMC_Repeater (Linux/RPi)');
    }

    writePrompt();
  }
}

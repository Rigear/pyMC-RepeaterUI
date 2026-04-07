import { BaseCommand, type CommandContext } from './BaseCommand';
import ApiService from '@/utils/api';

export class NeighborsCommand extends BaseCommand {
  name = 'neighbors';
  description = 'Show neighbor adverts';
  aliases = ['nb'];

  private isMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    );
  }

  async execute({ term, writePrompt }: CommandContext): Promise<void> {
    const stopLoading = this.startLoading(term, 'Fetching neighbors...');

    try {
      // Fetch adverts from all contact types
      const contactTypes = ['Chat Node', 'Repeater', 'Room Server', 'Hybrid Node', 'Unknown'];
      const allAdverts: any[] = [];

      for (const contactType of contactTypes) {
        try {
          const response = await ApiService.get('/adverts_by_contact_type', {
            contact_type: contactType,
            hours: 168,
          });
          const data = response.success && response.data ? response.data : response;
          const adverts = Array.isArray(data) ? data : [];
          allAdverts.push(...adverts);
        } catch (err) {
          // Skip if contact type has no data
          continue;
        }
      }

      stopLoading();

      if (allAdverts.length === 0) {
        this.writeInfo(term, 'No neighbors found');
      } else {
        this.writeSuccess(
          term,
          `Found \x1b[1m${allAdverts.length}\x1b[0m neighbor${allAdverts.length === 1 ? '' : 's'}`,
        );
        term.writeln('');

        if (this.isMobile()) {
          // Mobile: List format (show up to 10)
          allAdverts.slice(0, 10).forEach((adv: any, idx: number) => {
            term.writeln(`\x1b[1;36m[${idx + 1}] ${adv.node_name || 'Unknown'}\x1b[0m`);
            term.writeln(`  \x1b[90mPubKey:\x1b[0m ${adv.pubkey?.substring(0, 8) || '----'}`);
            term.writeln(`  \x1b[90mType:\x1b[0m ${adv.contact_type || '-'}`);
            if (adv.last_seen) {
              const lastSeen = new Date(adv.last_seen * 1000).toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              term.writeln(`  \x1b[90mLast Seen:\x1b[0m ${lastSeen}`);
            }
            if (adv.rssi) term.writeln(`  \x1b[90mRSSI:\x1b[0m ${adv.rssi}`);
            if (adv.snr) term.writeln(`  \x1b[90mSNR:\x1b[0m ${adv.snr}`);
            term.writeln(`  \x1b[90mAdverts:\x1b[0m ${adv.advert_count || 0}`);
            term.writeln(
              `  \x1b[90mDirect:\x1b[0m ${adv.zero_hop ? '\x1b[32myes\x1b[0m' : '\x1b[31mno\x1b[0m'}`,
            );
            if (idx < Math.min(allAdverts.length, 10) - 1) term.writeln('');
          });
        } else {
          // Desktop: Table format
          term.writeln(
            `\x1b[36m┌────┬──────────────────────┬────────┬──────────────┬──────────────────────┬──────────┬──────┬────────┬────────┐\x1b[0m`,
          );
          term.writeln(
            `\x1b[36m│ #  │ Name                 │ PubKey │ Type         │ Last Seen            │ RSSI     │ SNR  │ Adverts│ Direct │\x1b[0m`,
          );
          term.writeln(
            `\x1b[36m├────┼──────────────────────┼────────┼──────────────┼──────────────────────┼──────────┼──────┼────────┼────────┤\x1b[0m`,
          );

          allAdverts.slice(0, 10).forEach((adv: any, idx: number) => {
            const num = (idx + 1).toString().padEnd(2);
            const name = (adv.node_name || 'Unknown').padEnd(20);
            const pubkey = (adv.pubkey?.substring(0, 4) || '----').padEnd(6);
            const type = (adv.contact_type || '-').padEnd(12);
            const lastSeen = adv.last_seen
              ? new Date(adv.last_seen * 1000)
                  .toLocaleString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                  .padEnd(20)
              : '-'.padEnd(20);
            const rssi = (adv.rssi ? `${adv.rssi}` : '-').padEnd(8);
            const snr = (adv.snr ? `${adv.snr}` : '-').padEnd(4);
            const adverts = (adv.advert_count?.toString() || '0').padEnd(6);
            const direct = (adv.zero_hop ? 'yes' : 'no').padEnd(6);

            term.writeln(
              `\x1b[36m│\x1b[0m ${num} \x1b[36m│\x1b[0m \x1b[1m${name}\x1b[0m \x1b[36m│\x1b[0m ${pubkey} \x1b[36m│\x1b[0m ${type} \x1b[36m│\x1b[0m ${lastSeen} \x1b[36m│\x1b[0m ${rssi} \x1b[36m│\x1b[0m ${snr} \x1b[36m│\x1b[0m ${adverts} \x1b[36m│\x1b[0m ${direct} \x1b[36m│\x1b[0m`,
            );
          });

          term.writeln(
            `\x1b[36m└────┴──────────────────────┴────────┴──────────────┴──────────────────────┴──────────┴──────┴────────┴────────┘\x1b[0m`,
          );
        }

        if (allAdverts.length > 10) {
          term.writeln('');
          term.writeln(`\x1b[90m... and ${allAdverts.length - 10} more neighbors\x1b[0m`);
        }
      }
    } catch (error) {
      stopLoading();
      this.writeError(term, error instanceof Error ? error.message : 'Failed to fetch neighbors');
    }

    writePrompt();
  }
}

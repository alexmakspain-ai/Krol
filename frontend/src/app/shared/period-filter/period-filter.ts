import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PeriodPreset } from '../period';

@Component({
  selector: 'app-period-filter',
  imports: [FormsModule],
  templateUrl: './period-filter.html',
  styleUrl: './period-filter.scss',
})
export class PeriodFilter {
  readonly preset = input.required<PeriodPreset>();
  readonly customStart = input.required<string>();
  readonly customEnd = input.required<string>();

  readonly presetSelected = output<PeriodPreset>();
  readonly customStartChanged = output<string>();
  readonly customEndChanged = output<string>();
}

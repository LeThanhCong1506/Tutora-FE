// Học vị (degree/academic rank) options for the tutor "About Me" form.

export interface DegreeLevelOption {
  value: string;
  label: string;
}

export const DEGREE_LEVELS: DegreeLevelOption[] = [
  { value: 'Cao đẳng', label: 'Cao đẳng' },
  { value: 'Cử nhân', label: 'Cử nhân' },
  { value: 'Kỹ sư', label: 'Kỹ sư' },
  { value: 'Thạc sĩ', label: 'Thạc sĩ' },
  { value: 'Tiến sĩ', label: 'Tiến sĩ' },
  { value: 'Phó Giáo sư', label: 'Phó Giáo sư' },
  { value: 'Giáo sư', label: 'Giáo sư' },
];

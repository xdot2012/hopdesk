import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ColorPickerField from '~/components/ColorPickerField';
import { Input } from '~/components/ui/input';

type Props = {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
};

export default function SectorInlineEditor({
  name,
  color,
  onNameChange,
  onColorChange,
}: Props) {
  const { t } = useTranslation();
  const [localColor, setLocalColor] = useState(color);

  const handleColorChange = (nextColor: string) => {
    setLocalColor(nextColor);
    onColorChange(nextColor);
  };

  return (
    <div
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ColorPickerField
          value={localColor}
          onChange={handleColorChange}
          size="default"
          aria-label={t('sectors.sectorColor')}
        />
      </div>
      <Input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        minLength={2}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
      />
    </div>
  );
}

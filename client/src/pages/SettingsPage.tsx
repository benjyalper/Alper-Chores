import { useConfig } from '../api/hooks';
import { useI18n } from '../i18n/I18nContext';

export function SettingsPage() {
  const { t, code, languages, setLanguage } = useI18n();
  const config = useConfig();

  const weekStartLabel =
    config.data?.weekStartsOn === 'MONDAY'
      ? t('week_starts_monday')
      : t('week_starts_sunday');

  return (
    <div className="page">
      <h1 className="page__title">{t('nav_settings')}</h1>

      <section className="panel">
        <h2 className="panel__title">{t('language')}</h2>
        <div className="lang-choices">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              className={`btn ${l.code === code ? 'btn--primary' : 'btn--ghost'}`}
              aria-pressed={l.code === code}
              onClick={() => setLanguage(l.code)}
            >
              {l.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">{t('settings_household')}</h2>
        {config.isLoading ? (
          <p>{t('loading')}</p>
        ) : (
          <dl className="settings-list">
            <div>
              <dt>{t('member_name')}</dt>
              <dd>{config.data?.householdName}</dd>
            </div>
            <div>
              <dt>{t('settings_timezone')}</dt>
              <dd>{config.data?.timezone}</dd>
            </div>
            <div>
              <dt>{t('settings_week_starts')}</dt>
              <dd>{weekStartLabel}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="panel">
        <h2 className="panel__title">{t('settings_install_title')}</h2>
        <p className="muted">{t('settings_install_android')}</p>
        <p className="muted">{t('settings_install_ios')}</p>
      </section>

      <section className="panel">
        <h2 className="panel__title">{t('settings_about')}</h2>
        <p className="muted">{t('settings_about_text')}</p>
      </section>
    </div>
  );
}

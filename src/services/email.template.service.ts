import { injectable } from 'inversify';
import config from '../config';
import { Logger } from '../logger';

@injectable()
export class EmailTemplateService implements EmailTemplateServiceInterface {
  private logger = Logger.getInstance('EMAIL_TEMPLATE_SERVICE');

  async getRenderedTemplate(templateName: string, data: any): Promise<string> {
    try {
      const template = await import(`../emails/${config.email.template.folder}/${templateName}`);
      return template.render(data);
    } catch (error) {
      if (this.isRequired(templateName)) {
        this.logger.exception('getRenderedTemplate', error);
        throw error;
      }
    }

    return '';
  }

  isRequired(templateName: string): boolean {
    return config.email.template.required.indexOf(templateName) >= 0;
  }
}

const EmailTemplateServiceType = Symbol('EmailTemplateServiceInterface');
export { EmailTemplateServiceType };

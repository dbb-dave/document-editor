export const MOCK_DOCUMENT_FIELDS = {
  fields: [
    {
      name: 'full_name',
      type: 'text',
      description: "User's full name",
      placeholder: '[[FULL_NAME]]',
      required: true,
    },
    {
      name: 'address',
      type: 'address',
      description: "User's complete address",
      placeholder: '[[ADDRESS]]',
      required: true,
    },
    {
      name: 'phone_number',
      type: 'phone',
      description: "User's phone number",
      placeholder: '[[PHONE_NUMBER]]',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      description: "User's email address",
      placeholder: '[[EMAIL]]',
      required: true,
    },
    {
      name: 'comments',
      type: 'text',
      description: 'Additional comments from the user',
      placeholder: '[[COMMENTS]]',
      required: false,
    },
    {
      name: 'agree_terms',
      type: 'checkbox',
      description: 'Checkbox to agree to terms and conditions',
      placeholder: '[[AGREE_TERMS]]',
      required: true,
    },
    {
      name: 'subscribe_newsletter',
      type: 'checkbox',
      description: 'Checkbox to subscribe to the newsletter',
      placeholder: '[[SUBSCRIBE_NEWSLETTER]]',
      required: false,
    },
    {
      name: 'signature',
      type: 'text',
      description: "User's signature",
      placeholder: '[[SIGNATURE]]',
      required: true,
    },
    {
      name: 'signature_date',
      type: 'date',
      description: 'Date the document is signed',
      placeholder: '[[SIGNATURE_DATE]]',
      required: true,
    },
  ],
};

export const MOCK_DOCUMENT_TEXT = `Contact Information Section:

Full Name: [[FULL_NAME]]

Address: [[ADDRESS]]

Phone Number: [[PHONE_NUMBER]]

Email: [[EMAIL]]

Comments Section:

Comments: [[COMMENTS]]

Checkboxes:

[ ] [[AGREE_TERMS]] Agree to Terms and Conditions
[ ] [[SUBSCRIBE_NEWSLETTER]] Subscribe to Newsletter

Signature Section:

Signature: [[SIGNATURE]]

Date: [[SIGNATURE_DATE]]`;

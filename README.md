<!--
 Copyright 2022 Meta Mind AB
 
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

# accounting-services

Houses multiple microservices inside it.

- **auth:** Responsible for authenticating and authorizing operations on organization accounts and users. See [auth README](apps/auth/README.md) for more details.
- **data-upload:** Responsible for any functionality related to Business Carbon Calculator (Free version). See [data-upload README](apps/data-upload/README.md) for more details.
- **libs/utils:** Contains the shared utils. See [libs/utils README](libs/utils/README.md) for more details.

> 🚧 **Warning**
>
> It is currently not possible for developers not associated with Normative to
> start this project as it requires access to protected resources.

## Contributing

This project is maintained by Normative but currently not actively seeking external contributions. If you however are interested in contributing to the project please [sign up here](https://docs.google.com/forms/d/e/1FAIpQLSe80c9nrHlAq6w2vUbeFSPVGG7IPqorKMkizhHJ98viwnT-OA/viewform?usp=sf_link) or come [join us](https://normative.io/jobs/).

Thank you to all the people from Google.org who were critical in making this project a reality!
- Zachary Hynes ([@zhynes](https://github.com/zhynes))
- Mishu Garg ([@mishugarg09](https://github.com/mishugarg09))
- John Bartholomew ([@johnbartholomew](https://github.com/johnbartholomew))
- Matt Pellegrini ([@MattPellegrini](https://github.com/MattPellegrini))
- Craig Rogers ([@twentyrogersc](https://github.com/twentyrogersc))
- Megan Hopp ([@meganhopp](https://github.com/meganhopp))

## License
Copyright (c) Meta Mind AB. All rights reserved.

Licensed under the [Apache-2.0 license](/LICENSE)

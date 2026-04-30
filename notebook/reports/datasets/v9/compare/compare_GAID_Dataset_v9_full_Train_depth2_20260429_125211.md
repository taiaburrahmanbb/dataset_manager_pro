# Folder Comparison Report — depth = 2

- **Generated**     : `20260429_125211`
- **CSV**           : `/home/taiaburrahman/dataset_manager_pro/data/projects/GAID/07.csv/GAID_Dataset_v9_full_Train.csv`
- **Local root**    : `/home/taiaburrahman/dataset_manager_pro/data/processed/v9`
- **Folder depth**  : `2` (folders counted upward from file name)

> File-level match is computed by file basename within each folder key. 
> `Match` = files present in both, `Only CSV` = referenced by CSV but missing on disk, 
> `Only Local` = on disk but not referenced by CSV.

## Summary

| Metric | Count |
|---|---:|
| Unique folder keys in CSV   | 110 |
| Unique folder keys in local | 108 |
| Common (in both)            | 88 |
| Missing folders (in CSV, not local) | 22 |
| Extra folders   (in local, not CSV) | 20 |
| CSV images (total)          | 704,779 |
| Local images (total)        | 693,696 |
| **Matched images**          | **434,306** |
| Only-in-CSV images          | 270,473 |
| Only-in-local images        | 259,390 |

## Missing folders — referenced by CSV but not found locally (22)

| # | Folder Key | CSV Path (example) | Local Path (example) | CSV imgs | Local imgs | Match | Only CSV | Only Local |
|---:|---|---|---|---:|---:|---:|---:|---:|
| 1 | `Gen_samples_Gemini_100325/code_gen_100325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Gemini_100325/code_gen_100325` | `—` | 3,914 | 0 | 0 | 3,914 | 0 |
| 2 | `Gen_samples_Gemini_100325/humangen_nature_070325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Gemini_100325/humangen_nature_070325` | `—` | 402 | 0 | 0 | 402 | 0 |
| 3 | `gen_ai_detector_dataset/human` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/human` | `—` | 221,275 | 0 | 0 | 221,275 | 0 |
| 4 | `gen_ai_detector_dataset/human_2` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/human_2` | `—` | 14,730 | 0 | 0 | 14,730 | 0 |
| 5 | `gen_ai_detector_dataset/human_3` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/human_3` | `—` | 1,135 | 0 | 0 | 1,135 | 0 |
| 6 | `real/low_res` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/SupRes_aditya/real/low_res` | `—` | 831 | 0 | 0 | 831 | 0 |
| 7 | `real/real_faces_Japanese-Actors` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_Japanese-Actors` | `—` | 182 | 0 | 0 | 182 | 0 |
| 8 | `real/real_faces_JapaneseCelebrities_` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_JapaneseCelebrities_` | `—` | 1,171 | 0 | 0 | 1,171 | 0 |
| 9 | `real/real_faces_africanews.en_images` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_africanews.en_images` | `—` | 199 | 0 | 0 | 199 | 0 |
| 10 | `real/real_faces_american_1996communitty` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_american_1996communitty` | `—` | 774 | 0 | 0 | 774 | 0 |
| 11 | `real/real_faces_asian_Japan.PMO_` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_asian_Japan.PMO_` | `—` | 272 | 0 | 0 | 272 | 0 |
| 12 | `real/real_faces_asian_SAdiaspora` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_asian_SAdiaspora` | `—` | 34 | 0 | 0 | 34 | 0 |
| 13 | `real/real_faces_asian_fb_AllPakistanDramaPageOfficial` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_asian_fb_AllPakistanDramaPageOfficial` | `—` | 279 | 0 | 0 | 279 | 0 |
| 14 | `real/real_faces_asian_topindianactors` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_asian_topindianactors` | `—` | 381 | 0 | 0 | 381 | 0 |
| 15 | `real/real_faces_asian_wabfighters` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_asian_wabfighters` | `—` | 480 | 0 | 0 | 480 | 0 |
| 16 | `real/real_faces_black_GhanaFilmIndustry` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_black_GhanaFilmIndustry` | `—` | 153 | 0 | 0 | 153 | 0 |
| 17 | `real/real_faces_black_kenya` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_black_kenya` | `—` | 309 | 0 | 0 | 309 | 0 |
| 18 | `real/real_faces_classyfemale_images` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_classyfemale_images` | `—` | 447 | 0 | 0 | 447 | 0 |
| 19 | `real/real_faces_mtv_images` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_mtv_images` | `—` | 7,028 | 0 | 0 | 7,028 | 0 |
| 20 | `real/real_faces_usa` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_usa` | `—` | 24 | 0 | 0 | 24 | 0 |
| 21 | `real/real_faces_withtext_cnnpolitics_images` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_faces_withtext_cnnpolitics_images` | `—` | 1,728 | 0 | 0 | 1,728 | 0 |
| 22 | `real/real_images_faces_and_others` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_faces_multinational_130325/real/real_images_faces_and_others` | `—` | 4,191 | 0 | 0 | 4,191 | 0 |


## Extra folders — present locally but not referenced by CSV (20)

| # | Folder Key | CSV Path (example) | Local Path (example) | CSV imgs | Local imgs | Match | Only CSV | Only Local |
|---:|---|---|---|---:|---:|---:|---:|---:|
| 1 | `fake/Gen_samples_Gemini_100325` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Gemini_100325` | 0 | 4,016 | 0 | 0 | 4,016 |
| 2 | `real/human` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/human` | 0 | 221,280 | 0 | 0 | 221,280 |
| 3 | `real/human_2` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/human_2` | 0 | 14,732 | 0 | 0 | 14,732 |
| 4 | `real/human_3` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/human_3` | 0 | 1,135 | 0 | 0 | 1,135 |
| 5 | `real_faces_multinational_130325/real_faces_Japanese-Actors` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_Japanese-Actors` | 0 | 182 | 0 | 0 | 182 |
| 6 | `real_faces_multinational_130325/real_faces_JapaneseCelebrities_` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_JapaneseCelebrities_` | 0 | 1,171 | 0 | 0 | 1,171 |
| 7 | `real_faces_multinational_130325/real_faces_africanews.en_images` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_africanews.en_images` | 0 | 199 | 0 | 0 | 199 |
| 8 | `real_faces_multinational_130325/real_faces_american_1996communitty` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_american_1996communitty` | 0 | 774 | 0 | 0 | 774 |
| 9 | `real_faces_multinational_130325/real_faces_asian_Japan.PMO_` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_asian_Japan.PMO_` | 0 | 272 | 0 | 0 | 272 |
| 10 | `real_faces_multinational_130325/real_faces_asian_SAdiaspora` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_asian_SAdiaspora` | 0 | 34 | 0 | 0 | 34 |
| 11 | `real_faces_multinational_130325/real_faces_asian_fb_AllPakistanDramaPageOfficial` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_asian_fb_AllPakistanDramaPageOfficial` | 0 | 279 | 0 | 0 | 279 |
| 12 | `real_faces_multinational_130325/real_faces_asian_topindianactors` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_asian_topindianactors` | 0 | 381 | 0 | 0 | 381 |
| 13 | `real_faces_multinational_130325/real_faces_asian_wabfighters` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_asian_wabfighters` | 0 | 480 | 0 | 0 | 480 |
| 14 | `real_faces_multinational_130325/real_faces_black_GhanaFilmIndustry` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_black_GhanaFilmIndustry` | 0 | 153 | 0 | 0 | 153 |
| 15 | `real_faces_multinational_130325/real_faces_black_kenya` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_black_kenya` | 0 | 309 | 0 | 0 | 309 |
| 16 | `real_faces_multinational_130325/real_faces_classyfemale_images` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_classyfemale_images` | 0 | 447 | 0 | 0 | 447 |
| 17 | `real_faces_multinational_130325/real_faces_mtv_images` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_mtv_images` | 0 | 7,028 | 0 | 0 | 7,028 |
| 18 | `real_faces_multinational_130325/real_faces_usa` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_usa` | 0 | 24 | 0 | 0 | 24 |
| 19 | `real_faces_multinational_130325/real_faces_withtext_cnnpolitics_images` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_faces_withtext_cnnpolitics_images` | 0 | 1,728 | 0 | 0 | 1,728 |
| 20 | `real_faces_multinational_130325/real_images_faces_and_others` | `—` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/real_faces_multinational_130325/real_images_faces_and_others` | 0 | 4,191 | 0 | 0 | 4,191 |


## Common folders (88)

| # | Folder Key | CSV Path (example) | Local Path (example) | CSV imgs | Local imgs | Match | Only CSV | Only Local |
|---:|---|---|---|---:|---:|---:|---:|---:|
| 1 | `Shutterstock_Fake/fake` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Shutterstock_Fake/fake` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/PubDB_Fake/Shutterstock_Fake/fake` | 29,742 | 29,742 | 29,742 | 0 | 0 |
| 2 | `Shutterstock_Real/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/Shutterstock_Real/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/Shutterstock_Real/real` | 22,953 | 22,953 | 22,953 | 0 | 0 |
| 3 | `Test/Coast` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Test/Coast` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Test/Coast` | 53 | 53 | 53 | 0 | 0 |
| 4 | `Test/Desert` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Test/Desert` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Test/Desert` | 64 | 64 | 64 | 0 | 0 |
| 5 | `Test/Forest` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Test/Forest` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Test/Forest` | 59 | 59 | 59 | 0 | 0 |
| 6 | `Test/Glacier` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Test/Glacier` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Test/Glacier` | 70 | 70 | 70 | 0 | 0 |
| 7 | `Test/Mountain` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Test/Mountain` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Test/Mountain` | 59 | 59 | 59 | 0 | 0 |
| 8 | `Train/Coast` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Train/Coast` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Train/Coast` | 1,079 | 1,079 | 1,079 | 0 | 0 |
| 9 | `Train/Desert` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Train/Desert` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Train/Desert` | 1,331 | 1,331 | 1,331 | 0 | 0 |
| 10 | `Train/Forest` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Train/Forest` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Train/Forest` | 1,097 | 1,097 | 1,097 | 0 | 0 |
| 11 | `Train/Glacier` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Train/Glacier` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Train/Glacier` | 1,199 | 1,199 | 1,199 | 0 | 0 |
| 12 | `Train/Mountain` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Train/Mountain` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Train/Mountain` | 1,158 | 1,158 | 1,158 | 0 | 0 |
| 13 | `Val/Coast` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Val/Coast` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Val/Coast` | 139 | 139 | 139 | 0 | 0 |
| 14 | `Val/Desert` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Val/Desert` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Val/Desert` | 201 | 201 | 201 | 0 | 0 |
| 15 | `Val/Forest` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Val/Forest` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Val/Forest` | 173 | 173 | 173 | 0 | 0 |
| 16 | `Val/Glacier` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Val/Glacier` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Val/Glacier` | 165 | 165 | 165 | 0 | 0 |
| 17 | `Val/Mountain` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/LandscapeRec12K/real/Val/Mountain` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/LandscapeRec12K/real/Val/Mountain` | 156 | 156 | 156 | 0 | 0 |
| 18 | `ai_image_x_collection_feb25_cleaned/ImageFX` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/ImageFX` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/ImageFX` | 4,687 | 4,687 | 4,687 | 0 | 0 |
| 19 | `ai_image_x_collection_feb25_cleaned/adobeFirefly` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/adobeFirefly` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/adobeFirefly` | 1,034 | 1,034 | 1,034 | 0 | 0 |
| 20 | `ai_image_x_collection_feb25_cleaned/bingimagecreator` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/bingimagecreator` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/bingimagecreator` | 1,088 | 1,088 | 1,088 | 0 | 0 |
| 21 | `ai_image_x_collection_feb25_cleaned/dalle3` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/dalle3` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/dalle3` | 14,175 | 14,175 | 14,175 | 0 | 0 |
| 22 | `ai_image_x_collection_feb25_cleaned/deepdream` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/deepdream` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/deepdream` | 27 | 27 | 27 | 0 | 0 |
| 23 | `ai_image_x_collection_feb25_cleaned/flux` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/flux` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/flux` | 6,395 | 6,395 | 6,395 | 0 | 0 |
| 24 | `ai_image_x_collection_feb25_cleaned/gemini` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/gemini` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/gemini` | 210 | 210 | 210 | 0 | 0 |
| 25 | `ai_image_x_collection_feb25_cleaned/gork3` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/gork3` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/gork3` | 37 | 37 | 37 | 0 | 0 |
| 26 | `ai_image_x_collection_feb25_cleaned/gork3_generated_deepfake_BB_ethinicity_march25` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/gork3_generated_deepfake_BB_ethinicity_march25` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/gork3_generated_deepfake_BB_ethinicity_march25` | 228 | 228 | 228 | 0 | 0 |
| 27 | `ai_image_x_collection_feb25_cleaned/grok2` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/grok2` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/grok2` | 2,490 | 2,490 | 2,490 | 0 | 0 |
| 28 | `ai_image_x_collection_feb25_cleaned/ideogram2` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/ideogram2` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/ideogram2` | 430 | 430 | 430 | 0 | 0 |
| 29 | `ai_image_x_collection_feb25_cleaned/imagen3` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/imagen3` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/imagen3` | 3,568 | 3,568 | 3,568 | 0 | 0 |
| 30 | `ai_image_x_collection_feb25_cleaned/leonardoai` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/leonardoai` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/leonardoai` | 3,706 | 3,706 | 3,706 | 0 | 0 |
| 31 | `ai_image_x_collection_feb25_cleaned/midjourney` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/midjourney` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/midjourney` | 23,548 | 23,548 | 23,548 | 0 | 0 |
| 32 | `ai_image_x_collection_feb25_cleaned/nightcafe` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/nightcafe` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/nightcafe` | 61 | 61 | 61 | 0 | 0 |
| 33 | `ai_image_x_collection_feb25_cleaned/stabledIffusion` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/ai_image_x_collection_feb25_cleaned/stabledIffusion` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/ai_image_x_collection_feb25_cleaned/stabledIffusion` | 231 | 231 | 231 | 0 | 0 |
| 34 | `ai_shoes/fake` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/ai_shoes/fake` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/PubDB_Fake/ai_shoes/fake` | 1,318 | 1,318 | 1,318 | 0 | 0 |
| 35 | `dalle_rec_Fake/fake` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/dalle_rec_Fake/fake` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/PubDB_Fake/dalle_rec_Fake/fake` | 5,603 | 5,630 | 5,603 | 0 | 27 |
| 36 | `dalle_rec_Real/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/dalle_rec_Real/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/dalle_rec_Real/real` | 3,007 | 1,686 | 1,668 | 1,339 | 18 |
| 37 | `environmental_scenes/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/environmental_scenes/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/environmental_scenes/real` | 479 | 477 | 477 | 2 | 0 |
| 38 | `fake/Gen_samples_Gemini_150325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Gemini_150325` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Gemini_150325` | 2,718 | 2,808 | 2,718 | 0 | 90 |
| 39 | `fake/Gen_samples_Gemini_190325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Gemini_190325` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Gemini_190325` | 3,087 | 3,178 | 3,087 | 0 | 91 |
| 40 | `fake/Gen_samples_Grok2_200325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Grok2_200325` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Grok2_200325` | 4,008 | 4,120 | 4,008 | 0 | 112 |
| 41 | `fake/Gen_samples_Grok3_160325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Grok3_160325` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Grok3_160325` | 7,036 | 7,036 | 7,036 | 0 | 0 |
| 42 | `fake/Gen_samples_Grok3_180325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Grok3_180325` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Grok3_180325` | 5,981 | 5,981 | 5,981 | 0 | 0 |
| 43 | `fake/Gen_samples_Grok3_220325` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/Gen_samples/fake/Gen_samples_Grok3_220325` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/Gen_samples_Grok3_220325` | 3,600 | 3,600 | 3,600 | 0 | 0 |
| 44 | `gen_ai_detector_dataset/genAI` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/genAI` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/gen_ai_detector_dataset/genAI` | 134,329 | 134,332 | 134,329 | 0 | 3 |
| 45 | `gen_ai_detector_dataset/genAI_2` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/genAI_2` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/gen_ai_detector_dataset/genAI_2` | 82,398 | 82,398 | 82,398 | 0 | 0 |
| 46 | `gen_ai_detector_dataset/genAI_3` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/genAI_3` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/gen_ai_detector_dataset/genAI_3` | 4,181 | 4,181 | 4,181 | 0 | 0 |
| 47 | `gen_ai_detector_dataset/genAI_4` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/genAI_4` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/gen_ai_detector_dataset/genAI_4` | 716 | 716 | 716 | 0 | 0 |
| 48 | `gen_ai_detector_dataset/genAI_5` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/genAI_5` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/gen_ai_detector_dataset/genAI_5` | 42 | 43 | 42 | 0 | 1 |
| 49 | `gen_ai_detector_dataset/genAI_6` | `/home/ubuntu/vision/data/gen_ai_detector_dataset/genAI_6` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/gen_ai_detector_dataset/genAI_6` | 471 | 471 | 471 | 0 | 0 |
| 50 | `pht30k_Real/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/pht30k_Real/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/pht30k_Real/real` | 3,217 | 3,227 | 3,156 | 61 | 71 |
| 51 | `pixelpulse_1800/fake` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/pixelpulse_1800/fake` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/PubDB_Fake/pixelpulse_1800/fake` | 1,827 | 288 | 288 | 1,539 | 0 |
| 52 | `real/abstract_art` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/abstract_art` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/abstract_art` | 49 | 49 | 49 | 0 | 0 |
| 53 | `real/animals_wildlife` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/animals_wildlife` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/animals_wildlife` | 47 | 47 | 47 | 0 | 0 |
| 54 | `real/birdclef24` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/birdclef/real/birdclef24` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/birdclef/real/birdclef24` | 172 | 172 | 172 | 0 | 0 |
| 55 | `real/birdclef25` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/birdclef/real/birdclef25` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/birdclef/real/birdclef25` | 202 | 202 | 202 | 0 | 0 |
| 56 | `real/children_playing` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/children_playing` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/children_playing` | 49 | 49 | 49 | 0 | 0 |
| 57 | `real/extreme_weather` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/extreme_weather` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/extreme_weather` | 50 | 50 | 50 | 0 | 0 |
| 58 | `real/flowers_plants` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/flowers_plants` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/flowers_plants` | 46 | 46 | 46 | 0 | 0 |
| 59 | `real/food_cuisine` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/food_cuisine` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/food_cuisine` | 47 | 47 | 47 | 0 | 0 |
| 60 | `real/high_res` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/SupRes_aditya/real/high_res` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/SupRes_aditya/real/high_res` | 839 | 855 | 839 | 0 | 16 |
| 61 | `real/historical_monuments` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/historical_monuments` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/historical_monuments` | 49 | 49 | 49 | 0 | 0 |
| 62 | `real/industrial_machinery` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/industrial_machinery` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/industrial_machinery` | 47 | 47 | 47 | 0 | 0 |
| 63 | `real/landscape_mountains` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/landscape_mountains` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/landscape_mountains` | 49 | 49 | 49 | 0 | 0 |
| 64 | `real/medical_science` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/medical_science` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/medical_science` | 49 | 49 | 49 | 0 | 0 |
| 65 | `real/musical_instruments` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/musical_instruments` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/musical_instruments` | 48 | 48 | 48 | 0 | 0 |
| 66 | `real/portraits_people` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/portraits_people` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/portraits_people` | 50 | 50 | 50 | 0 | 0 |
| 67 | `real/space_astronomy` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/space_astronomy` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/space_astronomy` | 50 | 50 | 50 | 0 | 0 |
| 68 | `real/sports_action` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/sports_action` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/sports_action` | 48 | 48 | 48 | 0 | 0 |
| 69 | `real/street_photography` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/street_photography` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/street_photography` | 49 | 49 | 49 | 0 | 0 |
| 70 | `real/technology_gadgets` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/technology_gadgets` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/technology_gadgets` | 50 | 50 | 50 | 0 | 0 |
| 71 | `real/traditional_costumes` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/traditional_costumes` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/traditional_costumes` | 49 | 49 | 49 | 0 | 0 |
| 72 | `real/underwater_marine` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/underwater_marine` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/underwater_marine` | 49 | 49 | 49 | 0 | 0 |
| 73 | `real/urban_architecture` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/urban_architecture` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/urban_architecture` | 47 | 47 | 47 | 0 | 0 |
| 74 | `real/vintage_cars` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/image20/real/vintage_cars` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/Real_Images_to_Include/image20/real/vintage_cars` | 49 | 49 | 49 | 0 | 0 |
| 75 | `real_shoes/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/real_shoes/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/real_shoes/real` | 797 | 807 | 797 | 0 | 10 |
| 76 | `testing/INPUT_IMAGES` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/testing/INPUT_IMAGES` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/testing/INPUT_IMAGES` | 1,697 | 1,697 | 1,697 | 0 | 0 |
| 77 | `testing/expert_a_testing_set` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/testing/expert_a_testing_set` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/testing/expert_a_testing_set` | 388 | 389 | 388 | 0 | 1 |
| 78 | `testing/expert_b_testing_set` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/testing/expert_b_testing_set` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/testing/expert_b_testing_set` | 389 | 15 | 15 | 374 | 0 |
| 79 | `testing/expert_c_testing_set` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/testing/expert_c_testing_set` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/testing/expert_c_testing_set` | 410 | 81 | 80 | 330 | 1 |
| 80 | `testing/expert_d_testing_set` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/testing/expert_d_testing_set` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/testing/expert_d_testing_set` | 319 | 57 | 55 | 264 | 2 |
| 81 | `testing/expert_e_testing_set` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/testing/expert_e_testing_set` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/testing/expert_e_testing_set` | 306 | 316 | 306 | 0 | 10 |
| 82 | `training/GT_IMAGES` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/training/GT_IMAGES` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/training/GT_IMAGES` | 1,140 | 1,140 | 1,140 | 0 | 0 |
| 83 | `training/INPUT_IMAGES` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/training/INPUT_IMAGES` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/training/INPUT_IMAGES` | 4,766 | 4,766 | 4,766 | 0 | 0 |
| 84 | `tristanzhang32_Fake/fake` | `/home/ubuntu/vision/data/NewDB/NewDB_Fake/tristanzhang32_Fake/fake` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/fake/PubDB_Fake/tristanzhang32_Fake/fake` | 8,427 | 3,525 | 3,525 | 4,902 | 0 |
| 85 | `tristanzhang32_Real/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/tristanzhang32_Real/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/tristanzhang32_Real/real` | 13,935 | 12,334 | 12,212 | 1,723 | 122 |
| 86 | `ulid25k/real` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/ulid25k/real` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/ulid25k/real` | 24,200 | 24,200 | 24,200 | 0 | 0 |
| 87 | `validation/GT_IMAGES` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/validation/GT_IMAGES` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/validation/GT_IMAGES` | 42 | 42 | 42 | 0 | 0 |
| 88 | `validation/INPUT_IMAGES` | `/home/ubuntu/vision/data/NewDB/NewDB_Real/mit_adobe_5k_Real/real/validation/INPUT_IMAGES` | `/home/taiaburrahman/dataset_manager_pro/data/processed/v9/real/PubDB_Real/mit_adobe_5k_Real/real/validation/INPUT_IMAGES` | 209 | 209 | 209 | 0 | 0 |

